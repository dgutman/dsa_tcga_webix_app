import { JetView } from "webix-jet";
import { tabsState, appSettings } from "../appConfig";
import ComboURLPaths from "../models/comboPaths";
import treeModel from "../models/treeModel";
import TreeContextMenu from "./treeContext";
import constants from "../constants";
import getUrlByPatientId from "../services/URLbyPatientId";

let contextToFolder;

export default class TreeView extends JetView {

	constructor(app, name) {
		super(app, name);
		// this.isTCGA = false;
		this.canChangeSlideByURL = false;
		this.urlPaths = { folders: [] };
		this.initialPaths = { folders: [] };
	}

	config() {

		const tree = {
			view: "tree",
			select: true,
			scroll: "xy",
			css: "slidesTree",
			template: (obj, common) => {
				if (obj.$count == 0 && !obj.file)
					obj.$count = -1;
				return common.icon(obj, common) + common.folder(obj, common) + obj.name;
			},
			tooltip: (obj) => (obj.file) ? obj.name : "",
			on: {
				onItemDblClick: (id) => {
					this.getRoot().open(id);
				},
				onItemClick: (id) => {
					let item = this.getRoot().getItem(id);

					if (item.file) {
						if (!item._loadedBefore) {
							this.getFullItem(item);
						}
						else {
							this.loadSlide(item);
						}
					}
					else {
						this.urlPaths.folders.push(item.name);
						this.setResourceUrlString(id);
					}
				},
				onBeforeOpen: (id) => {
					let item = this.getRoot().getItem(id);
					const initialFolderIndex = this.initialPaths.folders.findIndex(folder => this.comboURLPaths.compareStrings(folder, item.name));
					if (initialFolderIndex !== -1) {
						this.initialPaths.folders.splice(initialFolderIndex, 1);
					}
					this.loadData(item);
				}
			}
		};

		return tree;
	}

	init() {
		this._topLayout = this.getRoot().getTopParentView();
		webix.extend(this._topLayout, webix.ProgressBar);
		const treeTab = this.getRoot().getParentView();
		if (!treeTab.config.collapsed) {
			this.initialPaths = this.getResourceUrl();
		}
		webix.serverURL = appSettings.serverApiURL;
		this.comboURLPaths = new ComboURLPaths(this.app);
		const tree = this.getRoot();
		webix.extend(tree, webix.ProgressBar);

		this.on(this.app, "expandSideMenu", (id) => {
			if (id === this.getRoot().getParentView().config.id) {
				if (tree.getSelectedId()) {
					tree.callEvent("onItemClick", [tree.getSelectedId()]);
				}
			}
		});

		if (this.initialPaths.byPatientId) {
			this._topLayout.showProgress();
			getUrlByPatientId(this.initialPaths.folders[0])
				.then((folders) => {
					this.initialPaths.folders = folders;
					this.getInitialFolderData();
					this._topLayout.hideProgress();
				})
				.catch(() => {
					this._topLayout.hideProgress();
				});
		}
		else {
			this.getInitialFolderData();
		}
	}

	ready() {
		const tree = this.getRoot();
		this.treeContextMenu = this.ui(TreeContextMenu).getRoot();
		this.treeContextMenu.attachTo(this.getRoot());

		tree.attachEvent("onBeforeContextMenu", (id) => {
			const item = tree.getItem(id);
			if (item._modelType === "folder" || item._modelType === "collection") {
				contextToFolder = true;
				this.contextFolder = item;
			}
			else {
				this.treeContextMenu.hide();
				return false;
			}
		});

		this.treeContextMenu.attachEvent("onItemClick", (id) => {
			let folderId;
			let items = [];

			if (contextToFolder) {
				folderId = this.contextFolder.id;
			}

			switch(id) {
				case constants.LINEAR_CONTEXT_MENU_ID: {
					const sourceParams = {
						sort: "_id",
						type: this.contextFolder._modelType
					};

					tree.showProgress();
					if (this.contextFolder.wasOpen || this.contextFolder.open) {
						this.findAndRemove(folderId, this.contextFolder, items);
					}

					tree.blockEvent();
					tree.data.blockEvent();
					tree.select(folderId);
					tree.open(folderId);
					tree.data.unblockEvent();
					tree.unblockEvent();
					this.contextFolder.wasOpen = true;

					this.getLinearStucture(this.contextFolder._id, sourceParams)
						.then(data => data.json())
						.then((data) => {
							this.contextFolder.linear = true;

							if (data.length === 0) {
								tree.parse({
									name: "Nothing to display", file: true, parent: folderId
								});
							}
							else {
								let count = 0;
								data.forEach((itemData) => {
									itemData.file = true;
									tree.add(itemData, count, folderId);
									count++;
								});
								treeModel.setRealScrollPosition(treeModel.defineSizesAndPositionForDynamicScroll(this.contextFolder, tree));

								tree.attachEvent("onAfterScroll", () => {
									const positionX = this.getTreePositionX();
									const scrollState = tree.getScrollState();
									if (positionX !== scrollState.x) {
										this.setTreePosition(scrollState.x);
										return false;
									}
									treeModel.attachOnScrollEvent(scrollState, this.contextFolder, tree);
								});
							}
							tree.hideProgress();
						})
						.fail(() => {
							tree.parse({name: "error", file: true, parent: folderId});
							tree.hideProgress();
						});
					break;
				}
			}
		});
	}

	urlChange() {
		const treeTab = this.getRoot().getParentView();
		if (!treeTab.config.collapsed && this.canChangeSlideByURL && this.myUrlPathString !== this.getUrlString()) {
			this.initialPaths = this.getResourceUrl();
			if (this.initialPaths.byPatientId) {
				this._topLayout.showProgress();
				getUrlByPatientId(this.initialPaths.folders[0])
					.then((folders) => {
						this.initialPaths.folders = folders;
						this.getRoot().clearAll();
						this.getInitialFolderData();
						this._topLayout.hideProgress();
					})
					.catch(() => {
						this._topLayout.hideProgress();
					});
			}
			else {
				this.getRoot().clearAll();
				this.getInitialFolderData();
			}
		}
	}

	getInitialFolderData() {
		const {
			initialParentId,
			initialParentType,
			serverApiURL
		} = appSettings;
		const tree = this.getRoot();

		if (initialParentId && initialParentType) {
			webix.ajax(`${serverApiURL}/folder?parentType=${initialParentType}&parentId=${initialParentId}`)
				.then(data => data.json())
				.then((data) => {
					tree.parse(data);
					if (this.initialPaths.folders[0]) {
						const preopenedItem = tree.find(item => this.comboURLPaths.compareStrings(item.name, this.initialPaths.folders[0]), true);
						if (preopenedItem) {
							tree.open(preopenedItem.id);
							tree.select(preopenedItem.id);
							tree.callEvent("onItemClick", [preopenedItem.id]);
						}
						else {
							this.initialPaths.folders = [];
						}
					}
				})
				.catch((error) => {
					webix.modalbox.hideAll();
					const err = typeof error === "string" ? err : JSON.parse(error.responseText).message;
					webix.alert({
						title: "Error",
						ok: "OK",
						text: err || `Unrecognized server error: ${serverApiURL}`,
						type: "alert-error"
					});
					this.getApiCollections();
				});
		}
		else {
			this.getApiCollections();
		}
	}

	getApiCollections() {
		webix.ajax(`${appSettings.serverApiURL}/collection`)
			.then((data) => {
				const tree = this.getRoot();
				tree.showProgress();
				data = data.json();
				tree.parse(data);
				if (this.initialPaths.folders[0]) {
					const preopenedItem = tree.find(item => this.comboURLPaths.compareStrings(item.name, this.initialPaths.folders[0]), true);
					if (preopenedItem) {
						tree.open(preopenedItem.id);
						tree.select(preopenedItem.id);
						tree.callEvent("onItemClick", [preopenedItem.id]);
					}
					else {
						this.initialPaths.folders = [];
					}
				}
				tree.hideProgress();
			})
			.catch((error) => {
				const err = typeof error === "string" ? err : error.responseText;
				webix.alert({
					title: "Error",
					ok: "OK",
					text: err || `Unrecognized server error: ${appSettings.serverApiURL}`,
					type: "alert-error"
				});
			});
	}

	loadData(item) {
		if (!item.wasOpen) {
			this.getRoot().showProgress();
			Promise.all(
				[
					webix.ajax(`${appSettings.serverApiURL}/folder?parentType=${item._modelType}&parentId=${item._id}`),
					webix.ajax(`${appSettings.serverApiURL}/resource/mongo_search?type=item&q={"folderId": {"$oid": "${item._id}"}}&limit=0`)
				]
			)
				.then((dataArr) => {
					return dataArr.map((data) => data.json());
				})
				.then((dataArr) => {
					const folders = dataArr[0];
					const images = dataArr[1];

					// folders
					let count = 0;
					folders.forEach((folder) => {
						this.getRoot().add(folder, count, item.id);
						count++;
					});
					const preopenedItem = this.getRoot().find(child => child.$parent === item.id && this.comboURLPaths.compareStrings(child.name, this.initialPaths.folders[0]), true);
					if (preopenedItem) {
						this.getRoot().open(preopenedItem.id);
						this.getRoot().select(preopenedItem.id);
						this.getRoot().callEvent("onItemClick", [preopenedItem.id]);
					}
					else {
						this.initialPaths.folders = [];
					}


					// items
					let initSlideId = null;
					count = 0;
					images.forEach((itemData) => {
						itemData.file = true;
						if (item.tcga)
							itemData.caseId = item.tcga.caseId;
						const addedItemId = this.getRoot().add(itemData, count, item.id);
						if (this.initialPaths.slide && this.comboURLPaths.compareStrings(this.initialPaths.slide, itemData.name)) {
							initSlideId = addedItemId;
						}
						count++;
					});
					if (initSlideId) {
						this.getRoot().select(initSlideId);
						this.getRoot().callEvent("onItemClick", [initSlideId]);
					}
					this.initialPaths.slide = null;
					item.wasOpen = true;
					this.getRoot().hideProgress();
				});
		}
	}

	getResourceUrl() {
		const urlParams = this.getUrl();
		const resourcePaths = urlParams.filter((item) => !item.view);
		const resourcePathsObject = { folders: [] };
		resourcePaths.forEach((path, i) => {
			if(i === 0 && path.page === constants.BY_PATIENT_ID_STRING) {
				resourcePathsObject.byPatientId = true;
			}
			else {
				resourcePathsObject.folders.push(path.page);
			}
		});
		resourcePathsObject.slide = this.getQueryParamSlide(urlParams);
		return resourcePathsObject;
	}

	getQueryParamSlide(url) {
		if (url[url.length - 1].params.slide) {
			return url[url.length - 1].params.slide;
		}
	}

	setResourceUrlString(id, slideName) {
		this.canChangeSlideByURL = false;
		if (!this.urlPaths.slide && slideName) {
			this.urlPaths.slide = slideName;
		}

		const parentId = this.getRoot().getParentId(id);

		if (parentId) {
			this.urlPaths.folders.push(this.getRoot().getItem(parentId).name);
			this.setResourceUrlString(parentId);
		}
		else {
			this.comboURLPaths.changeFolder(this.urlPaths.folders.reverse());

			let queryString = this.urlPaths.slide ? `?slide=${this.urlPaths.slide}` : "";
			this.myUrlPathString = `${this.comboURLPaths.getPathString()}${queryString}`;
			this.app.show(this.myUrlPathString)
				.then(() => {
					this.canChangeSlideByURL = true;
					this.urlPaths = { folders: [] };
				});
		}
	}

	findAndRemove(id, folder, array) {
		const tree = this.getRoot();
		tree.data.eachChild(id, (item) => {
			array.push(item.id);
		}, tree, true);

		tree.remove(array);
		folder.$count = -1; // typical for folders with webix_kids and no actual data
		folder.wasOpen = false;

		webix.dp(tree).ignore(() => {
			tree.updateItem(folder.id, folder);
		});
	}

	getLinearStucture(folderId, sourceParams) {
		const params = sourceParams ? {
			type: sourceParams.type || "folder",
			limit: sourceParams.limit || 50,
			offset: sourceParams.offset || 0,
			sort: sourceParams.sort || "lowerName",
			sortdir: sourceParams.sortdir || 1
		} : {};
		return webix.ajax()
			.get(`${appSettings.serverApiURL}/resource/${folderId}/items`, params);
	}

	getTreePositionX() {
		return this.getRoot().positionX;
	}

	setTreePosition(scrollStateX) {
		this.getRoot().positionX = parseInt(scrollStateX);
	}

	getFullItem(item, nonTCGA) {
		let url = nonTCGA ? `${appSettings.serverApiURL}/item/${item._id}` : `${appSettings.serverApiURL}/tcga/image/${item._id}`;
		const id = item.id;
		this._topLayout.showProgress();
		return webix.ajax(url)
			.then((data) => data.json())
			.then((data) => {
				this.getRoot().updateItem(id, data);
				item._loadedBefore = true;
				this.loadSlide(item);

				this._topLayout.hideProgress();
			})
			.catch(() => {
				this._topLayout.hideProgress();
				this.getFullItem(item, true); // GET non TCGA item
			});
	}

	loadSlide(item) {
		this.setResourceUrlString(item.id, item.name);

		if (!item.largeImage) {
			webix.message({ type: "debug", text: "No large image file in this item." });
			this.app.callEvent("enableSwitch", [false]);
			this.app.callEvent("enableButtons", [false]);
			this.app.callEvent("clearImageTemplate", []);
			this.app.callEvent("unselectFigureButton", []);
			return;
		}

		if ((item.meta && item.meta.PDFPathReport) || (item.tcga && item.tcga.caseId)) {
			tabsState.pathologyReport = "enable";
		}
		else tabsState.pathologyReport = "disable";

		if (item.meta && item.meta.hasClinicalMetaData || (item.tcga && item.tcga.caseId)) {
			tabsState.metadata = "enable";
		}
		else tabsState.metadata = "disable";

		// if (item.meta && item.meta.dsalayers && item.meta.geojslayer) {//Properties for TCGA collection
		if (item.hasOwnProperty("tcga")) {
			this.app.callEvent("enableButtons", [true, true]);
			this.app.callEvent("enableSwitch", [true, true]);
			// this.isTCGA = false;
		}
		else {
			this.app.callEvent("enableButtons", [false, false]);
			this.app.callEvent("enableSwitch", [false]);
		}

		this.app.callEvent("hidePopup", []);
		this.app.callEvent("changeSlidesSwitch", []);
		this.app.callEvent("imageLoad", [item]);
		this.app.callEvent("setFilters", [item._id]);
		this.app.callEvent("unselectFigureButton", []);
	}
}