import { JetView } from "webix-jet";
import "../datatableCounter";
import "../counterObj";

export default class AnnotationView extends JetView {

	constructor(app, name) {
		super(app, name);
		this.isDeleteButtonClicked = true;
		this.unclickableCss = "webix_unclickable_delete_icon";
	}

	config() {

		const popup = {
			view: "window",
			height: 500,
			width: 1050,
			position: "center",
			move: true,
			head: {
				view: "toolbar",
				borderless: true,
				padding: 20,
				cols: [
					{ view: "label", label: "Annotations".toUpperCase(), inputWidth: 155, width: 155, inputHeight: 50, css: "annotation_label" },
					{
						view: "button",
						type: "iconButton",
						icon: "fa fa-plus",
						label: "ADD NEW LAYER",
						css: "login_button white_button",
						inputWidth: 170,
						height: 50,
						width: 200,
						click: () => {
							const inputBox = this.getRoot().queryView({ name: "inputBox" });
							window.showAttentionPopup(() => {
								if (!inputBox.isVisible()) {
									inputBox.show();
								}
							});
						}
					},
					{ width: 20 },
					{
						cols: [
							{
								view: "text",
								inputWidth: 300,
								width: 300,
								label: "New Layer",
								name: "newLayerName",
								validate: webix.rules.isNotEmpty
							},
							{
								view: "button",
								type: "icon",
								icon: "fa fa-plus",
								hotkey: "enter",
								tooltip: "Add",
								inputWidth: 50,
								width: 50,
								click: () => {
									let textInput = this.getRoot().queryView({ name: "inputBox" }).queryView({ name: "newLayerName" });
									if (!textInput.getValue().trim()) {
										textInput.setValue("");
										webix.message({ type: "error", text: "Incorrect layer name format." });
										webix.UIManager.setFocus(textInput.config.id);
										return;
									}
									if (textInput.validate()) {

										const newLayer = {
											value: textInput.getValue(),
											type: "layer",
											open: true,
											fillColor: "#00FF00",
											strokeColor: "#000000",
											data: []
										};

										this.app.callEvent("changeTreeannotations", [newLayer]);
										textInput.setValue("");
										textInput.refresh();
										let inputBox = this.getRoot().queryView({ name: "inputBox" });
										if (inputBox.isVisible())
											inputBox.hide();
									}
								}
							}
						],
						on: {
							onViewShow: () => {
								const textInput = this.getRoot().queryView({ name: "inputBox" }).queryView({ name: "newLayerName" });
								webix.UIManager.setFocus(textInput.config.id);
							}
						},
						hidden: true,
						name: "inputBox"
					},
					{},
					{
						view: "icon",
						icon: "fa fa-times",
						width: 40,
						click: () => {
							let inputBox = this.getRoot().queryView({ name: "inputBox" });
							if (inputBox.isVisible())
								inputBox.hide();
							this.hidePopup();

						}
					}
				]
			},
			body: {
				view: "datatableCounter",
				threeState: true,
				css: "datatableCounter",
				rowHeight: 40,
				editable: true,
				tooltip: "#value#",
				editaction: "click",
				select: true,
				columns: [
					{ template: "<i class='fa fa-times-circle annotation_delete_icon'></i>", width: 47, id: "deleteButton", header: "" },
					{ id: "id", width: 60, header: "ID" },
					{ id: "value", header: "Name", width: 200, template: "{common.space()}{common.treecheckbox()}{common.icon()}#value#", editor: "text" },
					{ id: "type", header: "Type", fillspace: true },
					{
						id: "fillColor",
						header: "Fill color",
						editor: "color",
						template: (obj) => {
							if (obj.fillColor)
								return `
										<span class="color_preview" style="background-color: ${obj.fillColor};">
										</span>${obj.fillColor}`;
							else return "<i class=\"fa fa-eyedropper\" aria-hidden=\"true\"></i>";
						}
					},

					{
						id: "strokeColor",
						header: "Stroke color",
						width: 120,
						editor: "color",
						template: (obj) => {
							if (obj.strokeColor)
								return `
										<span class="color_preview" style="background-color:${obj.strokeColor};">
										</span>${obj.strokeColor}`;
							else return "<i class=\"fa fa-eyedropper\" aria-hidden=\"true\"></i>";
						}
					},
					{
						id: "strokeOpacity",
						header: "Stroke opacity",
						template: (obj, common) => {
							return (obj.type == "layer") ? "" : `<div class='counter'>${common.strokeOpacity(obj, common)}</div>`;
						},
						width: 120
					},
					{
						id: "fillOpacity",
						header: "Fill opacity",
						template: (obj, common) => {
							return (obj.type == "layer") ? "" : `<div class='counter'>${common.fillOpacity(obj, common)}</div>`;
						},
						width: 120
					},
					{
						id: "strokeWidth",
						header: "Stroke width",
						template: (obj, common) => {
							return (obj.type == "layer") ? "" : `<div class='counter'>${common.strokeWidth(obj, common)}</div>`;
						},
						width: 120
					}
				],
				scheme: {
					$init: function (obj) {
						if (obj.type == "layer") {
							obj.open = true;
						}
					}
				},
				activeContent: {
					fillOpacity: {
						view: "counterObj",
						value: 0,
						width: 120,
						min: 0.05,
						max: 0.95,
						step: 0.1,
						css: "webix_el_counter",
						on: {
							onChange: (function (ref) {
								return function (val) {
									let table = ref.getRoot().queryView({ view: "datatableCounter" });
									let item = table.getItem(this.config.$masterId.row);
									ref.app.callEvent("editFigureParametrs", [item, this.config.$masterId, val, "fillOpacity"]);
								};
							})(this)
						}
					},
					strokeOpacity: {
						view: "counterObj",
						value: 0,
						width: 120,
						min: 0.1,
						max: 1,
						css: "webix_el_counter",
						step: 0.1,
						on: {
							onChange: (function (ref) {
								return function (val) {
									let table = ref.getRoot().queryView({ view: "datatableCounter" });
									let item = table.getItem(this.config.$masterId.row);
									ref.app.callEvent("editFigureParametrs", [item, this.config.$masterId, val, "strokeOpacity"]);
								};
							})(this)
						}
					},
					strokeWidth: {
						view: "counterObj",
						value: 0,
						css: "webix_el_counter",
						width: 120,
						min: 0,
						max: 3,
						step: 0.2,
						on: {
							onChange: (function (ref) {
								return function (val) {
									let table = ref.getRoot().queryView({ view: "datatableCounter" });
									let item = table.getItem(this.config.$masterId.row);
									ref.app.callEvent("editFigureParametrs", [item, this.config.$masterId, val, "strokeWidth"]);
								};
							})(this)
						}
					}
				},
				onClick: {
					"fa-times-circle": (ev, id) => {
						if (!this.isDeleteButtonClicked) return false;
						const curFunc = () => {
							let table = this.getRoot().queryView({ view: "datatableCounter" });
							let item = table.getItem(id.row);
							if (item.type === "layer") {
								let curAnnotationToDeleteID = table.getFirstChildId(item.id);
								while (curAnnotationToDeleteID) {
									let curAnnotationToDelete = table.getItem(curAnnotationToDeleteID);
									table.remove(curAnnotationToDelete.id);
									this.app.callEvent("deleteAnnotation", [curAnnotationToDelete, item, table]);
									curAnnotationToDeleteID = table.getFirstChildId(item.id);
								}
								this.app.callEvent("deleteLayer", [item, table]);
								this.app.callEvent("changeTreeannotations", []);
							} else {
								table.remove(item.id);
								this.app.callEvent("deleteAnnotation", ["", item, table]);
							}
						};
						window.showAttentionPopup(curFunc);
						return false;
					},
					"webix_inp_counter_prev": () => {
						window.showAttentionPopup();
						return false;
					},
					"webix_inp_counter_next": () => {
						window.showAttentionPopup();
						return false;
					},
					"webix_inp_counter_value": () => {
						window.showAttentionPopup();
						return false;
					}
				},
				on: {
					onItemCheck: () => {
						let table = this.getRoot().queryView({ view: "datatableCounter" });
						this.app.callEvent("treecheckboxesClickedLabelsChecked", [table]);
					},
					onBeforeEditStop: (values, editor) => {
						window.showAttentionPopup(() => {
							if (editor.column == "value" && values.value == "")
								values.value = values.old;
						});
					},
					onAfterEditStop: (state, editor) => {
						let table = this.getRoot().queryView({ view: "datatableCounter" });
						let item = table.getItem(editor.row);
						this.app.callEvent("afterEditStop", [item, editor, state]);
					},
					onAfterRender: () => {
						if (this.getRoot()) {
							let datatableCounter = this.getRoot().queryView({ view: "datatableCounter" });
							const firstRow = datatableCounter.getFirstId();
							let itemNode;
							if (firstRow)
								itemNode = datatableCounter.getItemNode(firstRow);

							if (Object.keys(datatableCounter.data.pull).length == 1 && itemNode && itemNode.querySelector("i")) {
								this.isDeleteButtonClicked = false;
								if (!itemNode.querySelector("i").classList.contains(this.unclickableCss))
									itemNode.querySelector("i").classList.add(this.unclickableCss);
							}
							else if (itemNode && itemNode.querySelector("i")) {
								this.isDeleteButtonClicked = true;
								if (!itemNode.querySelector("i").classList.contains(this.unclickableCss))
									itemNode.querySelector("i").classList.remove(this.unclickableCss);
							}
						}
					}
				}
			}
		};

		return popup;
	}

	init() {
		this.on(this.app, "annotationTableParse", (treeannotation, item) => {
			let datatableCounter = this.getRoot().queryView({ view: "datatableCounter" });
			if (item) {
				datatableCounter.updateItem(item.id, item);
			}
			else if (treeannotation) {
				datatableCounter.clearAll();
				datatableCounter.parse(treeannotation);
			}
		});
	}

	showPopup() {
		this.getRoot().show();
		this.app.callEvent("annotationTableParse", []);
	}

	hidePopup() {
		this.getRoot().hide();
	}

}