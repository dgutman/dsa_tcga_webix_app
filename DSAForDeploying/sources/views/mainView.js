import { JetView } from "webix-jet";
import ImageTemplateView from "./imageTemplate";
import PathologyReportPopup from "./pathologyReportPopup";
import MetadataPopup from "./metadataPopup";
import AnnotationView from "./annotation";
import ApplyFiltersView from "./applyFilters";
import $ from "jquery";
import { tabsState } from "../appConfig";

export default class MainImageTemplate extends JetView {

	constructor(app, name) {
		super(app, name);
		this.layouts = [{
			"id": "1",
			"type": "layer",
			"fillColor": "#00FF00",
			"strokeColor": "#000000",
			"value": "Default Layer",
			"open": true
		}];
	}

	config() {
		const top_toolbar = {
			view: "toolbar",
			name: "top_toolbar",
			cols: [
				{
					view: "button",
					value: "Metadata",
					name: "metadata",
					click: () => {
						let item = this.getItem();
						this._metadataPopup.showWindow(item);
					}
				},
				{
					view: "button",
					value: "Apply Filters",
					name: "applyFilter",
					click: () => {
						const item = this.getItem();
						this._applyFiltersPopup.showWindow(item);
					}
				},
				{
					view: "button",
					name: "pathologyReport",
					value: "Pathology Report",
					click: async () => {
						let item = this.getItem();
						const button = this.getRoot().queryView({name: "pathologyReport"});
						button.showProgress();
						await this._pathologyPopup.showWindow(item);
						button.hideProgress();
					}
				},
				{ view: "button", value: "Aperio Annotations", name: "aperioAnnotations" }
			],
			borderless: true,
			disabled: true
		};

		const drawing_toolbar = {
			view: "toolbar",
			name: "drawing_toolbar",
			cols: [
				{
					cols: [
						{
							view: "button",
							type: "icon",
							localId: "line",
							icon: "fa fa-pencil",
							tooltip: "Line",
							inputWidth: 40,
							inputHeight: 40,
							width: 40,
							height: 40,
							click: () => {
								let deleteBool = this.organizeButtonsAction("line");
								this.enableSwitch(deleteBool);
								if (!deleteBool) {
									window.showAttentionPopup(() => this.app.callEvent("drawFigure", ["line"]));
								}
								else this.app.callEvent("disabledDrawingPointer", []);
								this.set_fullpage_button_handle();
							}
						},
						{
							view: "button",
							type: "icon",
							localId: "polygon",
							icon: "fa fa-connectdevelop",
							tooltip: "Polygon",
							inputWidth: 40,
							inputHeight: 40,
							width: 40,
							height: 40,
							click: () => {
								let deleteBool = this.organizeButtonsAction("polygon");
								this.enableSwitch(deleteBool);
								if (!deleteBool) {
									window.showAttentionPopup(() => this.app.callEvent("drawFigure", ["polygon"]));
								}
								else this.app.callEvent("disabledDrawingPointer", []);
								this.set_fullpage_button_handle();
							}
						},
						{
							view: "button",
							type: "icon",
							localId: "rectangle",
							icon: "fa fa-square-o",
							tooltip: "Rectangle",
							inputWidth: 40,
							inputHeight: 40,
							width: 40,
							height: 40,
							click: () => {
								let deleteBool = this.organizeButtonsAction("rectangle");
								this.enableSwitch(deleteBool);
								if (!deleteBool) {
									window.showAttentionPopup(() => this.app.callEvent("drawFigure", ["rectangle"]));
								}
								else this.app.callEvent("disabledDrawingPointer", []);
								this.set_fullpage_button_handle();
							}
						},
						{
							view: "button",
							type: "icon",
							localId: "point",
							icon: "fa fa-map-marker",
							tooltip: "Point",
							inputWidth: 40,
							inputHeight: 40,
							width: 40,
							height: 40,
							click: () => {
								let deleteBool = this.organizeButtonsAction("point");
								this.enableSwitch(deleteBool);
								if (!deleteBool) {
									window.showAttentionPopup(() => this.app.callEvent("drawFigure", ["point"]));
								}
								else this.app.callEvent("disabledDrawingPointer", []);
								this.set_fullpage_button_handle();
							}
						}
					],
					name: "drawing_buttons_layout"
				},
				{ width: 10 },
				{
					cols: [
						{
							view: "switch",
							bottomLabel: "No Labels",
							switch: "label",
							inputHeight: 35,
							height: 40,
							width: 75,
							labelWidth: 0,
							checkValue: true,
							uncheckValue: false,
							on: {
								onChange: (newValue) => {
									let switchElement = this.getRoot().queryView({ switch: "label" });
									window.switchLabel = newValue;
									if (newValue) {
										this.refreshRightLabel(switchElement, "Labels");
										this.app.callEvent("toggleLabel", [newValue]);
									}
									else {
										this.refreshRightLabel(switchElement, "No Labels");
										this.app.callEvent("toggleLabel", [newValue]);
									}
								},
								onAfterRender: function () {
									window.switchLabel = this.getValue();
								}
							}
						},
						{
							view: "switch",
							bottomLabel: "Drawing Disabled",
							switch: "drawing",
							inputHeight: 35,
							height: 40,
							width: 120,
							labelWidth: 0,
							checkValue: true,
							uncheckValue: false,
							on: {
								onChange: (newValue) => {
									let switchElement = this.getRoot().queryView({ switch: "drawing" });
									if (newValue) {
										this.refreshRightLabel(switchElement, "Drawing Enabled");
									}
									else {
										let fullPageButton = document.querySelector(".fullpageButton");
										if (fullPageButton)
											fullPageButton.style.display = "none";
										this.refreshRightLabel(switchElement, "Drawing Disabled");
										this.organizeButtonsAction(this.getCurrentButton());
										this.app.callEvent("disabledDrawingPointer", []);
									}
								}
							}
						}
					],
					css: "switchButtonsLayout",
				},
				{},
				{
					view: "richselect",
					width: 200,
					label: "Layer:",
					labelAlign: "right",
					align: "right",
					labelWidth: 50,
					inputWidth: 200,
					inputHeight: 40,
					value: 1,
					options: {
						body: {
							template: "#value#",
							data: this.layouts,
							tooltip: "#value#"
						}
					},
					on: {
						onChange: (newV) => {
							this.app.callEvent("richselectChanged", [newV]);
						}
					}
				},
				{
					view: "button",
					align: "right",
					type: "icon",
					icon: "fa fa-bars",
					tooltip: "Annotations",
					css: "blue_button",
					inputWidth: 40,
					inputHeight: 40,
					width: 40,
					height: 40,
					click: () => {
						this._annotationPopup.showPopup();
					}
				}
			],
			css: "drawing_toolbar",
			height: 60,
			borderless: true,
			disabled: true
		};

		return {
			rows: [
				top_toolbar,
				drawing_toolbar,
				ImageTemplateView
			],
			paddingX: 20,
			name: "slidesView"
		};
	}

	refreshRightLabel(obj, label) {
		obj.config.bottomLabel = label;
		obj.refresh();
	}

	enableSwitch(deleteBool) {
		let switchElement = this.getRoot().queryView({ switch: "drawing" });
		switchElement.setValue(!deleteBool);
		let fullPageButton = document.querySelector(".fullpageButton");
		if ((!fullPageButton.style.display || fullPageButton.style.display == "none") && !deleteBool)
			setTimeout(() => {
				fullPageButton.style.display = "inline-block";
			}, 0);
		else if (deleteBool)
			fullPageButton.style.display = "none";
	}

	setItem(item) {
		this.item = item;
	}

	getItem() {
		return this.item;
	}

	init() {

		document.onkeydown = (evt) => {
			evt = evt || window.event;
			if (evt.keyCode != 27 && !window.fullScreenImage) return;
			let switchElement = this.getRoot().queryView({ switch: "drawing" });
			if (switchElement && switchElement.getValue()) {
				switchElement.setValue(false);
			}
		};

		this.on(this.app, "refreshLayersRichselect", () => {
			const richselectList = this.getRoot().queryView({ view: "richselect" }).getList();
			richselectList.clearAll();
			this.layouts = [{
				"id": "1",
				"type": "layer",
				"fillColor": "#00FF00",
				"strokeColor": "#000000",
				"value": "Default Layer",
				"open": true
			}];
			richselectList.parse(this.layouts);
			const firstItemId = this.getRoot().queryView({ view: "richselect" }).getList().getFirstId();
			this.getRoot().queryView({ view: "richselect" }).setValue(firstItemId);
		});

		this.on(this.app, "unselectFigureButton", (shape) => {
			this.organizeButtonsAction(shape);
		});

		this.on(this.app, "enableButtons", (value, isTCGACollection) => {
			let top_toolbar = this.getRoot().queryView({ name: "top_toolbar" });
			let drawing_toolbar = this.getRoot().queryView({ name: "drawing_toolbar" });
			this.getRoot().queryView({ switch: "drawing" }).setValue(false);
			if (value) {
				top_toolbar.enable();
				drawing_toolbar.enable();
			}
			else {
				top_toolbar.disable();
				drawing_toolbar.disable();
			}

			if (!isTCGACollection && isTCGACollection != undefined) {
				if (!top_toolbar.isEnabled()) {
					top_toolbar.enable();
					drawing_toolbar.enable();
				}
			}

			let childs = top_toolbar.getChildViews();
			for (let i = 0; i < childs.length; i++) {
				if (tabsState) {
					if (tabsState[childs[i].config.name] == "disable") {
						if (childs[i].isEnabled())
							childs[i].disable();
					}
					else if (tabsState[childs[i].config.name] == "enable") {
						if (!childs[i].isEnabled())
							childs[i].enable();
					}
				}
			}
		});

		this.on(this.app, "imageLoad", (item) => {
			this.setItem(item);
		});

		this.on(this.app, "hidePopup", () => {
			this._pathologyPopup.hideWindow();
			this._metadataPopup.hideWindow();
			this._annotationPopup.hidePopup();
			this._applyFiltersPopup.hideWindow();
		});

		this.on(this.app, "changeRichselectData", (treeannotation) => {
			this.layouts = treeannotation;
			let richselect = this.getRoot().queryView({ view: "richselect" });
			let list = richselect.getList();
			list.clearAll();
			list.parse(this.layouts);
			richselect.setValue(list.getFirstId());
			richselect.refresh();
		});

		this.on(this.app, "setLayer", (layerId) => {
			let richselect = this.getRoot().queryView({ view: "richselect" });
			if (!layerId)
				layerId = richselect.getList().getFirstId();
			richselect.setValue(layerId);
		});

		this.on(this.app, "treecheckboxesClickedLabelsChecked", (table, checkedId) => {
			let switchElement = this.getRoot().queryView({ switch: "label" });
			let value = switchElement.getValue();
			this.app.callEvent("treecheckboxesClicked", [table, value, checkedId]);
		});

		this._pathologyPopup = this.ui(PathologyReportPopup);
		this._metadataPopup = this.ui(MetadataPopup);
		this._annotationPopup = this.ui(AnnotationView);
		this._applyFiltersPopup = this.ui(ApplyFiltersView);

		this._pathologyReportButton = this.getRoot().queryView({name: "pathologyReport"});
		webix.extend(this._pathologyReportButton, webix.ProgressBar);

		let button_layout = this.getRoot().queryView({ name: "drawing_buttons_layout" }).getChildViews();
		for (let i = 0; i < button_layout.length; i++) {
			if (button_layout[i].isEnabled()) {
				button_layout[i].disable();
			}
		}
	}

	set_fullpage_button_handle() {
		let fullPageButton = document.querySelector(".fullpageButton");
		if (fullPageButton) {
			fullPageButton.onclick = () => {
				let osd = document.querySelector(".openseadragon-canvas canvas");
				this.openFullscreen(osd);
				window.fullScreenImage = true;
			};

			$(".fullpageButton").hover(() => {
				$(".fullpageButton .fullpage_grouphover").css("display", "none");
				$(".fullpageButton .fullpage_hover").css("display", "block");
			}, () => {
				$(".fullpageButton .fullpage_grouphover").css("display", "block");
				$(".fullpageButton .fullpage_hover").css("display", "none");
			});
		}
	}

	/* Open fullscreen */
	openFullscreen(elem) {
		$(".fullpageButton .fullpage_grouphover").css("display", "block");
		$(".fullpageButton .fullpage_hover").css("display", "none");
		if (elem.requestFullscreen) {
			elem.requestFullscreen();
		} else if (elem.mozRequestFullScreen) {
			elem.mozRequestFullScreen();
		} else if (elem.webkitRequestFullscreen) {
			elem.webkitRequestFullscreen();
		} else if (elem.msRequestFullscreen) {
			elem.msRequestFullscreen();
		}
	}

	setCurrentButton(buttonId) {
		this.currentButtonId = buttonId;
	}

	getCurrentButton() {
		return this.currentButtonId;
	}

	organizeButtonsAction(localId) {
		let drawing_toolbar = this.getRoot().queryView({ name: "drawing_buttons_layout" });
		let buttons = drawing_toolbar.getChildViews();
		if (!localId) {
			for (let i = 0; i < buttons.length; i++) {
				let buttonNode = buttons[i].getNode().querySelector("button");
				if (buttonNode.classList.contains("button_selected"))
					buttonNode.classList.remove("button_selected");
			}
			return;
		}
		let buttonNode = this.$$(localId).getNode().querySelector("button");
		let del = true;
		if (!buttonNode.classList.contains("button_selected"))
			del = false;
		for (let i = 0; i < buttons.length; i++) {
			let buttonNode = buttons[i].getNode().querySelector("button");
			if (buttonNode.classList.contains("button_selected"))
				buttonNode.classList.remove("button_selected");
		}
		this.setCurrentButton("");
		if (!buttonNode.classList.contains("button_selected") && !del) {
			buttonNode.classList.add("button_selected");
			this.setCurrentButton(localId);
		}
		return del; //return true/false: delete class or not
	}
}