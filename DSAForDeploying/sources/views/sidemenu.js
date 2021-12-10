import { JetView } from "webix-jet";
import { preloaderImageURL, crashedImageURL, skipCrashedImages, tabsState, maxComboboxQuantity, mainViewPath, appSettings } from "../appConfig";
import ComboURLPaths from "../models/comboPaths";
import constants from "../constants";
import getUrlByPatientId from "../services/URLbyPatientId";

export default class SidemenuView extends JetView {

	constructor(app, name) {
		super(app, name);
		this.currentPatientId = "";
		this.additionalComboIds = [];
		this.initialPaths = { folders: [] }; // initial path from URL
		this.canChangeSlidePath = false;
		this.comboHeight = 46; // combobox height
		this.spacerHeight = 10; // spacers between comboboxes height
	}

	config() {

		webix.proxy.loadImagesPages = {
			$proxy: true,
			load: function (view, params) {
				let promise = null;
				if (params) {
					promise = webix.ajax(this.source + "&limit=" + params.count + "&offset=" + params.start);
				} else {
					promise = webix.ajax(this.source + "&limit=0&offset=0");
				}
				return promise;
			}
		};

		webix.proxy.loadImagesPagesByCaseName = {
			$proxy: true,
			load: function(view, params) {
				const promise = webix.ajax(this.source);
				return promise;
			}
		};

		const comboScrollView = {
			view: "scrollview",
			height: 1,
			css: "combo-scrollview",
			borderless: true,
			scroll: "y",
			body: {
				rows: []
			}
		};

		const photogallery = {
			rows: [
				{
					view: "dataview",
					datafetch: 15,
					tooltip: "#name#",
					localId: "photogallery",
					select: true,
					scroll: false,
					type: {
						height: 110,
						width: 110,
						getThumbnail: (item) => {
							if (!item.fileSRC) {
								const dataview = this.$$("photogallery");
								item.fileSRC = preloaderImageURL;
								webix.ajax().response("blob").get(`${webix.serverURL}/item/${item._id}/tiles/thumbnail`)
									.then((data) => {
										item.fileSRC = URL.createObjectURL(data);
										if (dataview.exists(item.id)) {
											dataview.updateItem(item.id, item);
										}
									})
									.catch(() => {
										let localSkipCrashedImages = skipCrashedImages;
										if (window.skipCrashedImages != undefined)
											localSkipCrashedImages = window.skipCrashedImages;
										if (!localSkipCrashedImages) {
											item.fileSRC = crashedImageURL;
											item.crashedImage = true;
											if (dataview.exists(item.id)) {
												dataview.updateItem(item.id, item);
											}
										}
										else this.$$("photogallery").remove(item.id);
									});
							}
						}
					},
					template: (obj, common) => {
						common.getThumbnail(obj, common);
						return `<img class = "sidemenu_img" src="${obj.fileSRC}">
								<div class = "sidemenu_img_label">${obj.name}</div>`;
					},
					pager: "pagerA",
					on: {
						onAfterSelect: (id) => {
							this.app.callEvent("clearImageTemplate", []);
							let dataview = this.getRoot().queryView({ view: "dataview" });
							let item = dataview.getItem(id);
							this.canChangeSlidePath = false;
							if(this.urlPaths && this.urlPaths.folders && Array.isArray(this.urlPaths.folders)) {
								if(this.urlPaths.folders[0] === "caseName") {
									this.app.show(`CDSA/caseName/${item.tcga.case}?slide=${item.name}`)
										.then(() => { this.canChangeSlidePath = true; });
								}
							}
							else {
								this.app.show(`${this.comboURLPaths.getPathString()}?slide=${item.name}`)
									.then(() => { this.canChangeSlidePath = true; });
							}
							if ((item.meta && item.meta.PDFPathReport) || (item.tcga && item.tcga.caseId)) {
								tabsState.pathologyReport = "enable";
							}
							else tabsState.pathologyReport = "disable";

							if ((item.meta && item.meta.hasClinicalMetaData) || (item.tcga && item.tcga.caseId)) {
								tabsState.metadata = "enable";
							}
							else tabsState.metadata = "disable";

							if (item && !item.hasOwnProperty("crashedImage")) {
								// if (item.meta && item.meta.dsalayers && item.meta.geojslayer) {//Properties for TCGA collection
								if (item.hasOwnProperty("tcga")) {
									this.app.callEvent("enableButtons", [true, true]);
									this.app.callEvent("enableSwitch", [true, true]);
								}
								else {
									this.app.callEvent("enableButtons", [false, false]);
								}
								this.app.callEvent("hidePopup", []);
								this.app.callEvent("changeSlidesSwitch", []);
								this.app.callEvent("imageLoad", [item]);
								this.app.callEvent("setFilters", [item._id]);
								this.app.callEvent("unselectFigureButton", []);
							}
							else {
								this.app.callEvent("enableSwitch", [false]);
								this.app.callEvent("enableButtons", [false]);
								this.app.callEvent("imageLoad", []);
								this.app.callEvent("hidePopup", []);
								this.app.callEvent("changeSlidesSwitch", []);
								this.app.callEvent("unselectFigureButton", []);
							}

						},
						onAfterLoad: () => {
							const dataview = this.getRoot().queryView({ view: "dataview" });
							const pager = this.getRoot().queryView({ view: "pager" });
							let dataviewData = dataview.data.pull;
							dataviewData = Object.values(dataviewData);
							// if (dataviewData.length && dataviewData[0].hasOwnProperty("tcga") && dataviewData[0].tcga.hasOwnProperty("caseId")) {
							// 	this.setCaseId(dataviewData[0].tcga.caseId);
							// }
							for (let i = 0; i < dataviewData.length; i++) {
								// if (this.getCaseId()) {
								// 	dataviewData[i].caseId = this.getCaseId();
								// 	if (!dataviewData[i].tcga || !dataviewData[i].tcga.caseId) {
								// 		dataviewData[i].tcga = dataviewData[i].tcga || {};
								// 		Object.assign(dataviewData[i].tcga, {caseId: this.getCaseId()});
								// 	}
								// }
								if (this.initialSlide && this.comboURLPaths.compareStrings(this.initialSlide, dataviewData[i].name)) {
									const pData = pager.data;
									if (pData.size && i >= pData.size) {
										const page = parseInt(i / pData.size, 10);
										pager.select(page);
									}
									dataview.showItem(dataviewData[i].id);
									dataview.select(dataviewData[i].id);
									this.initialSlide = null;
								}
							}

							if (dataviewData.length) {
								if (!dataview.getSelectedId()) {
									dataview.select(dataviewData[0].id);
								}
								else {
									this.initialSlide = null;
								}
								pager.show();
								dataview.hideOverlay();
							}
							else {
								pager.hide();
								dataview.showOverlay(`<div class='photogallery-overlay'>
														<span class='overlay-text'>There are no slides</span>
													</div>`);
							}
						}
					}
				},
				{
					view: "pager",
					id: "pagerA",
					css: "sidemenuPager",
					size: 15,
					template: (obj, common) => {
						let limit = obj.limit;
						if (obj.count == 0 && obj.limit == undefined)
							limit = 1;
						return `<div class = "dataview_pager">
								<div class = 'pager_buttons'>${common.prev(obj, common)}</div>
								<div class = 'page_counter'>${common.page(obj, common)}&nbsp;
									<span class = 'grey_counter'>/&nbsp;${limit}</span>
								</div>
								<div class='pager_buttons'>${common.next(obj, common)}</div>
								<span class='grey_counter'>${obj.count} slides</span>
								</div>`;
					}
				}
			],
			hidden: true,
			localId: "photogallery_layout"
		};

		const placeholder_template = {
			template: (obj) => {
				if (obj.hasOwnProperty("template")) return obj.template;
				else return "<p>To see slides please select source of data load.</p>";
			},
			localId: "placeholder_template",
			borderless: true,
			css: "test"
		};

		return {
			rows: [
				comboScrollView,
				{ height: 10 },
				placeholder_template,
				photogallery
			],
			padding: 20
		};
	}

	// setCaseId(id) {
	// 	this.caseId = id;
	// }

	// getCaseId() {
	// 	return this.caseId;
	// }

	getApiCollections() {
		webix.ajax(`${webix.serverURL}/collection`)
			.then((collections) => {
				collections = collections.json();
				let comboId = this.addNewCombo();
				if (comboId) {
					const dropDownList = this.$$(comboId).getPopup().getBody();
					dropDownList.parse(collections);
					this.$$(comboId).attachEvent("onChange", (function (ref) {
						return function (id) {
							ref.app.callEvent("changeSlidesSwitch", []);
							ref.clearNextCombo(this);
							if (id && ref.getComboboxQuantity() >= maxComboboxQuantity) {
								ref.getSlides(id, this);
							}
							else {
								ref.getNestingFolders(id, this);
							}
						};
					})(this));

					const firstId = dropDownList.getFirstId();
					if (this.initialPaths.folders.length) {
						const collection = dropDownList.serialize().find(item => this.comboURLPaths.compareStrings(item.name, this.initialPaths.folders[0]));
						if (collection) {
							this.$$(comboId).setValue(collection.id);
							this.initialPaths.folders.shift();
						}
						else {
							this.$$(comboId).setValue(firstId);
						}
					}
					else {
						this.$$(comboId).setValue(firstId);
					}
				}
			})
			.catch((error) => {
				webix.modalbox.hideAll();
				const err = typeof error === "string" ? err : JSON.parse(error.responseText).message;
				webix.alert({
					title: "Error",
					ok: "OK",
					text: err || `Unrecognized server error: ${appSettings.serverApiURL}`,
					type: "alert-error"
				});
			});
	}

	addNewCombo() {
		let scrollview = this.getRoot().queryView({ view: "scrollview" });

		let templateId = scrollview.getBody().addView({ height: this.spacerHeight });
		let comboId = scrollview.getBody().addView({ // combo view object
			view: "combo",
			height: this.comboHeight,
			inputHeight: this.comboHeight,
			// width: 100, // Combo width
			name: `combo_${this.additionalComboIds.length}`,
			suggest: {
				body: {
					template: (obj) => {
						if (obj.name)
							return obj.name;
						else
							return obj.value;
					},
					data: [],
					yCount: 5
				}
			}
		});

		const maxScrollviewHeight = (this.comboHeight + this.spacerHeight) * (Math.min(maxComboboxQuantity, 3));

		let currentHeight = scrollview.$height;
		if (currentHeight < maxScrollviewHeight) {
			currentHeight += (this.comboHeight + this.spacerHeight);
			currentHeight = Math.min(currentHeight, maxScrollviewHeight);
		}
		else {
			currentHeight = maxScrollviewHeight;
			if (scrollview.getNode().classList.contains("combo-scrollview")) {
				scrollview.getNode().classList.remove("combo-scrollview");
				scrollview.getNode().classList.add("showscroll-combo-scrollview");
			}
		}
		scrollview.define("height", currentHeight);
		scrollview.resize();
		scrollview.scrollTo(0, currentHeight);
		this.additionalComboIds.push(templateId);
		this.additionalComboIds.push(comboId);
		return comboId;
	}

	getNestingFolders(id, combo) {
		let parentId = "";
		let parentType = "";
		if (id && combo) {
			let value = combo.getList().data.pull[id];
			parentId = value._id;
			parentType = value._modelType;
		}
		else {
			parentId = appSettings.initialParentId;
			parentType = appSettings.initialParentType;
		}
		const params = {
			limit: 1000
		};
		webix.ajax(`${webix.serverURL}/folder?parentType=${parentType}&parentId=${parentId}`, params).then((data) => {
			data = data.json();
			if (data.length == 0) {
				// let lastComboId = this.additionalComboIds[this.additionalComboIds.length - 1];
				// let lastCombo = this.$$(lastComboId);
				// let comboItem = lastCombo.getList().getItem(id);
				// this.setCaseId(comboItem.parentId);
				if (id === "") {
					this.clearAll();
					return;
				}
				if (!this.$$("photogallery_layout").isVisible()) {
					this.$$("photogallery").hideOverlay();
					this.$$("photogallery_layout").show();
					this.$$("placeholder_template").hide();
				}
				this.getRoot().queryView({ view: "dataview" }).showProgress();
				let url = `loadImagesPages->${webix.serverURL}/resource/${parentId}/items?type=${parentType}`;
				this.$$("photogallery").clearAll();
				this.$$("photogallery").load(url);
			}
			else {
				data.forEach((item) => {
					if (item.name)
						item.value = item.name;
				});
				let comboId = this.addNewCombo();
				if (comboId && this.getComboboxQuantity() >= maxComboboxQuantity) {
					this.$$(comboId).getPopup().getBody().parse(data);
					this.$$(comboId).attachEvent("onChange", (function (ref) {
						return function (id) {
							ref.getSlides(id, this);
						};
					})(this));
					const dropDownList = this.$$(comboId).getPopup().getBody();
					const firstId = dropDownList.getFirstId();
					if (this.initialPaths.folders.length) {
						const folder = dropDownList.serialize().find(item => this.comboURLPaths.compareStrings(item.name, this.initialPaths.folders[0]));
						if (folder) {
							this.$$(comboId).setValue(folder.id);
							this.initialPaths.folders.shift();
						}
						else {
							this.$$(comboId).setValue(firstId);
						}
					}
					else {
						this.$$(comboId).setValue(firstId);
					}
					return;
				}
				else if (comboId) {
					this.$$(comboId).getPopup().getBody().parse(data);
					this.$$(comboId).attachEvent("onChange", (function (ref) {
						return function (id, oldId) {
							ref.app.callEvent("changeSlidesSwitch", []);
							ref.clearNextCombo(this, oldId);
							ref.setFoldersToURL();
							if (id)
								ref.getNestingFolders(id, this);
						};
					})(this));
					const dropDownList = this.$$(comboId).getPopup().getBody();
					const firstId = dropDownList.getFirstId();
					if (this.initialPaths.folders.length) {
						const folder = dropDownList.serialize().find(item => this.comboURLPaths.compareStrings(item.name, this.initialPaths.folders[0]));
						if (folder) {
							this.$$(comboId).setValue(folder.id);
							this.initialPaths.folders.shift();
						}
						else {
							this.$$(comboId).setValue(firstId);
						}
					}
					else {
						this.$$(comboId).setValue(firstId);
					}
				}
			}
		})
			.catch((error) => {
				webix.modalbox.hideAll();
				const err = typeof error === "string" ? err : JSON.parse(error.responseText).message;
				webix.alert({
					title: "Error",
					ok: "OK",
					text: err || `Unrecognized server error: ${appSettings.serverApiURL}`,
					type: "alert-error"
				});

				if (parentId === appSettings.initialParentId && parentType === appSettings.initialParentType) {
					this.getApiCollections();
				}
			});
		if (parentType !== "collection") {
			webix.ajax(`${webix.serverURL}/item?folderId=${parentId}`).then((result) => {
				if (result.length) {
					let url = `loadImagesPages->${webix.serverURL}/resource/${parentId}/items?type=${parentType}`;
					this.$$("photogallery").clearAll();
					this.$$("photogallery").load(url);
				}
			});
		}
	}

	clearNextCombo(combo) {
		if (this.additionalComboIds.includes(combo.config.id)) {
			let index = this.additionalComboIds.indexOf(combo.config.id);
			let scrollviewBody = this.getRoot().queryView({ view: "scrollview" }).getBody();
			let del = false;
			for (let i = index + 1; i < this.additionalComboIds.length; i++) {
				scrollviewBody.removeView(this.additionalComboIds[i]);
				del = true;
			}
			this.additionalComboIds.splice(index + 1);
			if (del) {
				const scrollviewHeight = (this.comboHeight + this.spacerHeight) * (this.additionalComboIds.length / 2);
				const maxScrollviewHeight = (this.comboHeight + this.spacerHeight) * (Math.min(maxComboboxQuantity, 3));
				this.getRoot().queryView({ view: "scrollview" }).define("height", Math.min(maxScrollviewHeight, scrollviewHeight));
				this.getRoot().queryView({ view: "scrollview" }).resize();
				this.$$("placeholder_template").parse({});
				this.clearAllTemplates();
			}
			else {
				this.$$("placeholder_template").parse({ template: "" });
				this.clearAllTemplates();
			}
		}
	}

	clearAll() {
		// this.setCaseId();
		this.$$("placeholder_template").parse({});
		let scrollviewBody = this.getRoot().queryView({ view: "scrollview" }).getBody();
		for (let i = 0; i < this.additionalComboIds.length; i++) {
			scrollviewBody.removeView(this.additionalComboIds[i]);
		}
		this.additionalComboIds = [];
		this.getRoot().queryView({ view: "scrollview" }).define("height", 56);
		this.getRoot().queryView({ view: "scrollview" }).resize();
		this.clearAllTemplates();
	}

	clearAllTemplates() {
		this.app.callEvent("unselectFigureButton", []);
		this.app.callEvent("hidePopup", []);
		this.$$("photogallery").clearAll();
		this.$$("photogallery").setPage(0);
		this.app.callEvent("enableSwitch", [false]);
		this.app.callEvent("enableButtons", [false]);

		if (this.$$("photogallery_layout").isVisible())
			this.$$("photogallery_layout").hide();

		if (!this.$$("placeholder_template").isVisible())
			this.$$("placeholder_template").show();

		this.app.callEvent("clearImageTemplate", []);

	}

	init() {
		this.comboURLPaths = new ComboURLPaths(this.app);
		this._topLayout = this.getRoot().getTopParentView();
		webix.extend(this._topLayout, webix.ProgressBar);
		const url = this.getUrl();
		const thumbnailTab = this.getRoot().getParentView();
		if (!thumbnailTab.config.collapsed) {
			this.initialSlide = this.getQueryParamSlide(url);
			this.initialPaths = this.getResourcePaths();
		}
		webix.extend(this.$$("photogallery"), webix.ProgressBar);
		webix.serverURL = appSettings.serverApiURL;
		this.getData();

		this.on(this.app, "expandSideMenu", (id) => {
			if (id === this.getRoot().getParentView().config.id) {
				const photogallery = this.$$("photogallery");
				if (photogallery && photogallery.isVisible() && photogallery.getSelectedId()) {
					this.comboURLPaths.setURLPath();
					photogallery.callEvent("onAfterSelect", [photogallery.getSelectedId()]);
				}
			}
		});
	}

	ready() {
		webix.extend(this.$$("photogallery"), webix.OverlayBox);
		webix.attachEvent("onResize", () => {
			let childsCombo = this.getRoot().queryView({ view: "scrollview" }).getBody().getChildViews();
			for (let i = 0; i < childsCombo.length; i++) {
				if (childsCombo[i].config.view == "combo") {
					let popup = childsCombo[i].getPopup();
					if (popup.isVisible())
						popup.hide();
				}
			}

			let itemWidth = this.$$("photogallery").config.type.width;
			let itemHeight = this.$$("photogallery").config.type.height;
			let containerWidth = this.$$("photogallery").$width;
			let containerHeight = this.$$("photogallery").$height;
			let pagerSize = this.$$("photogallery").getPager().config.size;

			let itemCountRow = Math.floor(containerWidth / itemWidth);
			if (itemCountRow == 0)
				itemCountRow = 1;

			let itemCountCol = Math.floor(containerHeight / itemHeight);
			if (itemCountCol == 0)
				itemCountCol = 1;

			if (containerHeight) {
				pagerSize = itemCountCol * itemCountRow;
				this.$$("photogallery").getPager().define("size", pagerSize);
				this.$$("photogallery").refresh();
			}
		});
	}

	urlChange() {
		const thumbnailTab = this.getRoot().getParentView();
		this.oldUrlPaths = this.urlPaths ? webix.copy(this.urlPaths) : { folders:[] };
		this.urlPaths = this.getResourcePaths();
		if (!thumbnailTab.config.collapsed && this.canChangeSlidePath) {
			if (this.urlPaths.byPatientId) {
				this._topLayout.showProgress();
				getUrlByPatientId(this.urlPaths.folders[0])
					.then((folders) => {
						this.initialPaths.folders = folders;
						this.initialPaths.byPatientId = false;
						this.urlPaths.folders = this.initialPaths.folders;
						this.changeSlideByUrl();
						this._topLayout.hideProgress();
					})
					.catch(() => {
						this._topLayout.hideProgress();
					});
			}
			else if(this.urlPaths.folders.length > 0) {
				if(this.urlPaths.folders[0] === "caseName") {
					const caseName = this.urlPaths.folders[1];
					if(caseName) {
						const url = `loadImagesPagesByCaseName->${webix.serverURL}/tcga/image?caseName=${caseName}`;
						this.$$("photogallery").clearAll();
						this.$$("photogallery").load(url);
					}
				}
			}
			else {
				this.changeSlideByUrl();
			}
		}
	}

	changeSlideByUrl() {
		if(this.urlPaths && this.urlPaths.folders && Array.isArray(this.urlPaths.folders) && this.urlPaths.folders.length > 0 && this.urlPaths.folders[0] !== "undefind") {
			if(this.urlPaths.folders[0] === "caseName") {
				const caseName = this.urlPaths.folders[1];
				const url = `loadImagesPagesByCaseName->${webix.serverURL}/tcga/images?caseName=${caseName}`;
				this.$$("photogallery").clearAll();
				this.$$("photogallery").load(url);
			}
		}
		else {
			const folderObj = this.getChangedFolder();

			if (folderObj.index !== -1) {
				this.initialPaths = this.urlPaths;
				this.initialPaths.folders = this.initialPaths.folders.splice(folderObj.index + 1);

				if (this.initialPaths.slide && !this.comboURLPaths.compareStrings(this.initialPaths.slide, this.oldUrlPaths.slide)) {
					this.initialSlide = this.initialPaths.slide;
				}

				const scrollview = this.getRoot().queryView({ view: "scrollview" });
				const combos = scrollview.queryView({view: "combo"}, "all");

				const changedCombo = combos[folderObj.index];
				const comboList = changedCombo.getPopup().getBody();
				const changedItem = comboList.find(item => this.comboURLPaths.compareStrings(item.name, folderObj.name), true);
				if (changedItem) {
					const oldValue = changedCombo.getValue();
					changedCombo.blockEvent();
					changedCombo.setValue(changedItem.id);
					changedCombo.unblockEvent();
					if (oldValue !== changedItem.id) {
						changedCombo.callEvent("onChange", [changedItem.id]);
					}
				}
			}
			else if (!this.comboURLPaths.compareStrings(this.urlPaths.slide, this.oldUrlPaths.slide)) {
				this.initialSlide = this.urlPaths.slide || this.initialSlide;
				this.$$("photogallery").callEvent("onAfterLoad");
			}
		}
	}

	getChangedFolder() {
		const index = this.oldUrlPaths.folders.findIndex((item, i) => !this.comboURLPaths.compareStrings(item, this.urlPaths.folders[i]));
		return {
			index,
			name: this.urlPaths.folders[index]
		};
	}

	getSlides(id, combo) {
		this.app.callEvent("changeSlidesSwitch", []);
		this.clearNextCombo(combo);
		this.setFoldersToURL();
		if (id) {
			let comboValue = combo.getList().data.pull[id];
			let parentId = comboValue._id;
			let parentType = comboValue._modelType;
			if (!this.$$("photogallery_layout").isVisible()) {
				this.$$("photogallery").hideOverlay();
				this.$$("photogallery_layout").show();
				this.$$("placeholder_template").hide();
			}
			this.getRoot().queryView({ view: "dataview" }).showProgress();
			let url = `loadImagesPages->${webix.serverURL}/resource/${parentId}/items?type=${parentType}`;
			this.$$("photogallery").clearAll();
			this.$$("photogallery").load(url);
		}
	}

	getResourcePaths() {
		const urlParams = this.getUrl();
		const resourcePaths = urlParams.filter((item) => !item.view);
		const resourcePathsObject = { folders: [] };
		resourcePaths.forEach((path, i) => {
			if(i === 0 && path.page === constants.BY_PATIENT_ID_STRING) {
				resourcePathsObject.byPatientId = true;
			}
			else {
				const pathWithoutURICharacters = this.comboURLPaths.escapeURICharacters(path.page);
				resourcePathsObject.folders.push(pathWithoutURICharacters);
			}
		});
		resourcePathsObject.slide = this.getQueryParamSlide(urlParams);
		return resourcePathsObject;
	}

	setFoldersToURL() {
		this.canChangeSlidePath = false;
		const scrollview = this.getRoot().queryView({ view: "scrollview" });
		const combos = scrollview.queryView({view: "combo"}, "all");
		const folderCombos = combos;
		const folderNames = [];
		folderCombos.forEach((combo) => {
			folderNames.push(combo.getText());
		});
		if(this.urlPaths.folders[0] !== "caseName") {
			this.comboURLPaths.changeFolder(folderNames)
				.then(() => {
					this.canChangeSlidePath = true;
				});
		}
	}

	getQueryParamSlide(url) {
		if (url[url.length - 1].params.slide) {
			return url[url.length - 1].params.slide;
		}
	}

	getComboboxQuantity() {
		const scrollview = this.getRoot().queryView({ view: "scrollview" });
		const combos = scrollview.queryView({view: "combo"}, "all");
		return combos.length;
	}

	getData() {
		if (!this.initialPaths.byPatientId) {
			if (appSettings.initialParentId && appSettings.initialParentType) {
				this.getNestingFolders();
			}
			else {
				this.getApiCollections();
			}
		}
		else {
			this._topLayout.showProgress();
			getUrlByPatientId(this.initialPaths.folders[0])
				.then((folders) => {
					this.initialPaths.folders = folders;
					this.initialPaths.byPatientId = false;
					this.getData();
					this._topLayout.hideProgress();
				})
				.catch(() => {
					this._topLayout.hideProgress();
				});
		}
	}
}
