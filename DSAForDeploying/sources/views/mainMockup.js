import { JetView } from "webix-jet";
import SidemenuView from "./sidemenu";
import { sideMenuTabConfig } from "../appConfig";
import MainImageTemplate from "./mainView";
import HeaderView from "./header";
import TreeView from "./treeView";
import MetadataTableView from "./metadataTable";

export default class MainView extends JetView {

	constructor(app, name) {
		super(app, name);
		this.viewsId = {};
	}

	config() {

		return {
			rows: [
				HeaderView,
				{
					view: "accordion",
					type: "wide",
					name: "mainAccordion",
					margin: 5,
					cols: [
						this.getMenuConfig(),
						{ view: "resizer" },

						{
							body: {
								rows: [
									{
										cols: [
											{
												view: "switch",
												value: "slidesView",
												label: "Slides view",
												labelRight: "Metadata view",
												labelWidth: 80,
												inputHeight: 35,
												css: "mainMockupSwitch",
												disabled: true,
												checkValue: "metadataView",
												uncheckValue: "slidesView",
												on: {
													onChange: (newv) => {
														const multiview = this.getRoot().queryView({ name: "multiview" });
														if (newv == "metadataView") {
															let itemId;
															let item;
															if (multiview.getChildViews()[0] && multiview.getChildViews()[0].$scope
																&& multiview.getChildViews()[0].$scope.getItem() && multiview.getChildViews()[0].$scope.getItem()._id) {

																item = multiview.getChildViews()[0].$scope.getItem();
																itemId = item._id;
															}
															if (itemId) {
																this.app.callEvent("setMetadataToDatatable", [itemId, item]);
															}
														}
														if (newv == "metadataView" && window.viewer)
															window.imageZoom = window.viewer.viewport.getZoom();
														else
															window.imageZoomChange = true;
														multiview.setValue(this.viewsId[newv]);
														this.app.callEvent("setBounds", []);
													}
												},
												height: 35
											},
											{}
										],
										paddingX: 20,
										paddingY: 3
									},
									{
										name: "multiview",
										cells: [
											MainImageTemplate,
											MetadataTableView
										]
									}
								]
							},
							minWidth: 663
						}
					],
					padding: 5,
					on: {
						onAfterCollapse: () => {
							this.refreshSlide();
						},
						onAfterExpand: () => {
							if (this.getRoot()) {
								this.refreshSlide();
							}
						}
					}
				}
			]
		};
	}

	refreshSlide() {
		const switchValue = this.getRoot().queryView({ view: "switch" }).getValue();
		if (switchValue === "slidesView" && window.slide) {
			this.app.callEvent("setSlide", [window.slide, true]);
			window.viewer.viewport.zoomTo(3);
			window.viewer.viewport.goHome(true);
		}
		this.app.callEvent("setBounds", []);
	}

	init() {
		this.on(this.app, "enableSwitch", (value, isTCGA) => {
			const switchButton = this.getRoot().queryView({ view: "switch" });
			if (value && !switchButton.isEnabled()) {
				switchButton.enable();
			}
			else {
				if (value) return;
				if (switchButton.isEnabled()) {
					switchButton.disable();
				}
			}
			if (typeof isTCGA !== "undefined") {
				if (isTCGA && !switchButton.isEnabled()) {
					switchButton.enable();
				}
				else if (!isTCGA && switchButton.isEnabled()) {
					switchButton.disable();
				}
			}
		});

		// this.on(this.app, "switchState", (boolValue) => {
		// 	debugger
		// 	const switchButton = this.getRoot().queryView({ view: "switch" });
		// 	if (boolValue) {
		// 		//enabled switch button
		// 		// if (!switchButton.isEnabled())
		// 			switchButton.enable();
		// 	}
		// 	else if (!boolValue) {
		// 		//disabled switch button
		// 		// if (switchButton.isEnabled())
		// 			switchButton.disable();
		// 	}
		// });
	}

	ready() {
		const multiview = this.getRoot().queryView({ name: "multiview" });
		const childViews = multiview.getChildViews();
		childViews.forEach((element) => {
			this.viewsId[element.config.name] = element.config.id;
		});

		this.on(this.app, "changeSlidesSwitch", () => {
			const multiview = this.getRoot().queryView({ name: "multiview" });
			multiview.setValue(this.viewsId["slidesView"]);
			const switchButton = this.getRoot().queryView({ view: "switch" });
			switchButton.setValue("slidesView");
		});
	}

	getMenuConfig() {
		switch (sideMenuTabConfig) {
			case 1:
			case "tree":  {
				return {
					header: "Tree",
					css: "blue_label",
					width: 350,
					minWidth: 250,
					body: TreeView,
					on: {
						onViewResize: () => {
							this.refreshSlide();
						}
					},
				};
			}
			case 2:
			case "thumbnail": {
				return {
					header: "Thumbnails",
					css: "blue_label",
					width: 350,
					minWidth: 250,
					body: SidemenuView,
					on: {
						onViewResize: () => {
							this.refreshSlide();
						}
					},
				};
			}
			case 3:
			case "both":
			default: {
				return {
					header: "slides".toUpperCase(),
					css: "blue_label",
					body: {
						view: "accordion",
						type: "space",
						margin: 5,
						padding: 5,
						rows: [
							{ header: "Tree", body: TreeView, collapsed: true },
							{ header: "Thumbnails", body: SidemenuView }
						],
						on: {
							onAfterExpand: (id) => {
								this.app.callEvent("expandSideMenu", [id]);
							}
						}
					},
					on: {
						onViewResize: () => {
							this.refreshSlide();
						}
					},
					width: 350,
					minWidth: 250
				};
			}
		}
	}
}