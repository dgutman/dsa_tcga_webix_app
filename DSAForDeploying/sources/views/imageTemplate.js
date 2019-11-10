import { JetView } from "webix-jet";
import geo from "../../node_modules/geojs/geo.min";
import $ from "jquery";
import User from "../models/session";

export default class ImageTemplateView extends JetView {
	constructor(app, name) {
		super(app, name);
		this.treeannotations = [{
			"id": "1",
			"type": "layer",
			"fillColor": "#00FF00",
			"strokeColor": "#000000",
			// "checked": true,
			"value": "Default Layer",
			"open": true,
			"data": []
		}];
		this.layer = null;
		this.slide = null;
		this.currentSlide = null;
		this.currentLayerId = "1";
		// this.currentShape = "rectangle";
		this.currentShape = "";
		this.table = null;
		this.selectedData = null;
		this.isReloadData = false;
		this.annotationsLength = 0;
		this.isAnnotationAdd = false;
		this.lastLabelNumber = 0;
		this.user = new User();
	}

	config() {
		const template = {
			css: "test",
			view: "template",
			name: "imageTemplate",
			borderless: true,
			template: `
			<div class="viewer-container" id="geo_osd" style="width:100%;height:100%;">
			<div class="viewer" style="width:100%;height:100%;position:absolute">
				<div class="container" id="image_viewer" style="width:100%; height:100%;position: relative">
				</div>
			</div>
			<!--GEO JS layer for drawing-->
			<div class="viewer">
				<div class="container" id="geojs" style="width:100%; height:100%;position: relative">
				</div>
			</div>
			<div class = "fullpageButton">
				<img src="../../img/fullscreen/fullpage_grouphover.png" style="width:100%" class = "fullpage_grouphover">
				<img src="../../img/fullscreen/fullpage_hover.png" style="width:100%; display:none;" class = "fullpage_hover">
			</div>
		</div>
            `,
			on: {
				onAfterLoad: () => {
					if (this.getItem() && Object.keys(this.getItem()).length !== 0) {
						let item = this.getItem();

						let viewer = OpenSeadragon({
							id: "image_viewer",
							prefixUrl: "node_modules/openseadragon/build/openseadragon/images/",
							navigatorPosition: "BOTTOM_RIGHT",
							showNavigator: true,
							loadTilesWithAjax: true,
							ajaxHeaders: {
								"Girder-Token": this.user.token()
							}
						});

						viewer.svgOverlay();

						webix.ajax(`${webix.serverURL}/item/${item._id}/tiles`).then((data) => {
							let tiles = data.json();
							this.tiles = tiles;


							let tileSource = {
								width: tiles.sizeX,
								height: tiles.sizeY,
								tileWidth: tiles.tileWidth,
								tileHeight: tiles.tileHeight,
								minLevel: 0,
								maxLevel: tiles.levels - 1,
								getTileUrl: function (level, x, y) {
									return webix.serverURL + "/item/" + item._id + "/tiles/zxy/" + level + "/" + x + "/" + y + "?edge=crop";
								}
							};

							viewer.open(tileSource);
							window.viewer = viewer;
							window.slide = this;
							this.app.callEvent("setSlide", [this]);
						});

					}
				}
			}
		};

		return {
			rows: [
				template,
				{
					template: (obj) => {
						if (Object.keys(obj).length !== 0)
							return obj.name;
						else return "";
					},
					height: 60,
					css: "name_template",
					borderless: true,
					name: "nameTemplate"
				}
			]

		};
	}

	setItem(item) {
		this.item = item;
	}

	getItem() {
		return this.item;
	}

	init() {

		$(".test").dblclick(() => {
			if (window.annotationLayer.annotations().length == this.annotationsLength && this.currentShape)
				this.app.callEvent("drawFigure", [this.currentShape]);
			else return;
		});

		$(".test").click(() => {
			if (this.isAnnotationAdd)
				this.app.callEvent("drawFigure", [this.currentShape]);
			else return;
		});

		this.on(this.app, "treecheckboxesClicked", (annTable, labelsBool) => {
			this.treeCheckBoxesClicked(annTable, labelsBool);
		});

		/* 	CALLED WHERE WE DELETED LAYER OR ADDED NEW LAYER */
		this.on(this.app, "changeTreeannotations", (newLayer) => {
			if (newLayer) {
				newLayer.id = Number(this.treeannotations[this.treeannotations.length - 1].id) + 1;
				this.treeannotations[this.treeannotations.length] = newLayer;
				this.currentLayerId = newLayer.id;
				this.updateGirderWithAnnotationData();
				this.app.callEvent("setLayer", [this.currentLayerId, newLayer]);
			} else {
				this.app.callEvent("setLayer", []);
			}
		});

		this.on(this.app, "imageLoad", (array) => {
			if (!array) {
				this.getRoot().queryView({ name: "imageTemplate" }).refresh();
				this.getRoot().queryView({ name: "nameTemplate" }).parse({});
				return;
			}
			this.setItem(array);
			this.getRoot().queryView({ name: "imageTemplate" }).parse(array);
			this.getRoot().queryView({ name: "nameTemplate" }).parse(array);
		});

		this.on(this.app, "clearImageTemplate", () => {
			this.setItem({});
			this.getRoot().queryView({ name: "imageTemplate" }).parse({});
			this.getRoot().queryView({ name: "nameTemplate" }).parse({});
		});

		this.on(this.app, "drawFigure", (figure) => {
			this.isAnnotationAdd = false;
			if (window.annotationLayer)
				this.annotationsLength = window.annotationLayer.annotations().length;
			this.draw(figure);
		});

		this.on(this.app, "setSlide", (sd, boolValue) => {
			this.app.callEvent("refreshLayersRichselect", []);
			this.slide = sd;
			this.resetDataStructures(boolValue);
			let params = geo.util.pixelCoordinateParams("#geojs", sd.tiles.sizeX, sd.tiles.sizeY, sd.tiles.tileWidth, sd.tiles.tileHeight);
			params.map.clampZoom = false;
			params.map.clampBoundsX = false;
			params.map.clampBoundsY = false;
			window.map = geo.map(params.map);
			window.map.autoResize(true);
			window.annotationLayer = this.layer = window.map.createLayer("annotation");
			window.map.interactor().options({ actions: [] });
			this.lastLabelNumber = 0;
			window.that = this;
			// add handlers to tie navigation events together
			window.viewer.addHandler("open", this.setBounds);
			window.viewer.addHandler("animation", this.setBounds);
			window.map.geoOn(geo.event.annotation.state, this.newAnnotation);

			//get metadata to load existing annotations
			if (boolValue) {
				if (this.geoJSON && this.treeannotations.length != 0) {
					this.layer.geojson(this.geoJSON, "update");
				}
				this.treeCheckBoxesClicked("", "", true);
				let fullPageButton = document.querySelector(".fullpageButton");
				if (fullPageButton && fullPageButton.style.display == "inline-block")
					document.querySelector("#geojs .geojs-layer").style.pointerEvents = "auto";
				return;
			}
			this.getMetadataAndLoadAnnotations();
		});

		this.on(this.app, "toggleLabel", (newValue) => {
			this.toggleLabel(newValue);
		});

		this.on(this.app, "richselectChanged", (newValue) => {
			this.currentLayerId = newValue;
		});

		this.on(this.app, "deleteAnnotation", (curAnnotationToDelete, item, annTable) => {
			this.table = annTable;
			if (item.type === "layer") {
				let annotation = this.layer.annotationById(curAnnotationToDelete.geoid);
				this.layer.removeAnnotation(annotation);
				this.propertiesEdited("deleteAnnotation", curAnnotationToDelete.geoid, "", "", annTable, item.type);
			}
			else {
				let annotation = this.layer.annotationById(item.geoid);
				this.layer.removeAnnotation(annotation);
				this.propertiesEdited("deleteAnnotation", item.geoid, "", "", annTable);
			}
		});

		this.on(this.app, "deleteLayer", (item, table) => {
			this.table = table;
			this.propertiesEdited("deleteLayer", item.id, "", "", table);
		});

		this.on(this.app, "editFigureParametrs", (item, masterId, val, param) => {
			let annotation = this.layer.annotationById(item.geoid);
			let opt = annotation.options("style");
			opt[masterId.column] = val;
			annotation.options({ style: opt }).draw();
			this.propertiesEdited(param, item.geoid, val, "");
		});

		this.on(this.app, "afterEditStop", (item, editor, state) => {
			if (!item) return;
			let annotation = this.layer.annotationById(item.geoid);
			if (!annotation && item.type == "layer") {
				let layer;
				for (let i = 0; i < this.treeannotations.length; i++) {
					if (this.treeannotations[i].id == item.id) {
						this.treeannotations[i].value = item.value;
						this.treeannotations[i][editor.column] = state.value;
						layer = this.treeannotations[i];
						break;
					}
				}
				this.app.callEvent("changeRichselectData", [this.treeannotations]);
				this.updateGirderWithAnnotationData("", item);

				if (layer && editor.column != "value") {
					for (let i = 0; i < layer.data.length; i++) {
						let childAnnotation = this.layer.annotationById(layer.data[i].geoid);
						let options = childAnnotation.options("style");
						if (childAnnotation) {
							if (options) {
								options[editor.column] = layer[editor.column];
								childAnnotation.options({ style: options }).draw();
							}

							this.propertiesEdited("annotationStyleChange", layer.data[i].geoid, layer[editor.column], editor.column);
						}
					}
				}
				return;
			}
			else if (item.type != "layer" && editor.column == "value" && item.hasOwnProperty("$parent")) {
				for (let i = 0; i < this.treeannotations.length; i++) {
					if (this.treeannotations[i].id == item.$parent) {
						let layerShapes = this.treeannotations[i].data;
						for (let j = 0; j < layerShapes.length; j++) {
							if (layerShapes[j].id == item.id) {
								layerShapes[j].value = state.value;

								let evt = this.layer.annotationById(item.geoid);
								if (evt) {
									evt.label(state.value);
								}
								this.updateGirderWithAnnotationData("", item);
								window.map.draw();
								break;
							}
						}
						break;
					}
				}
				return;
			}

			let opt = annotation.options("style");

			if (editor.column === "name") {
				//Name edit to  Geo JSON
				annotation.name(state.value);
				window.map.draw();
			} else {
				//Color (Stroke & Fill) edits to  Geo JSON
				opt[editor.column] = state.value;
				annotation.options({ style: opt }).draw();
			}
			this.propertiesEdited("annotationStyleChange", item.geoid, state.value, editor.column);
		});

		this.on(this.app, "disabledDrawingPointer", () => {
			if (document.querySelector("#geojs .geojs-layer"))
				document.querySelector("#geojs .geojs-layer").style.pointerEvents = "none";
			this.currentShape = "";
		});

		this.on(this.app, "setBounds", () => {
			this.setBounds();
			this.isSetBounds = true;
		});
	}

	draw(type) {
		this.currentShape = type;
		document.querySelector("#geojs .geojs-layer").style.pointerEvents = "auto";
		this.layer.mode(this.currentShape);
	}

	setBounds() {
		if (window.viewer) {
			let bounds = window.viewer.viewport.viewportToImageRectangle(window.viewer.viewport.getBounds(true));
			window.map.bounds({
				left: bounds.x,
				right: bounds.x + bounds.width,
				top: bounds.y,
				bottom: bounds.y + bounds.height
			});
		}
		if (window.imageZoom && window.viewer && window.imageZoomChange) {
			window.viewer.viewport.zoomTo(window.imageZoom);
			window.imageZoom = null;
			window.imageZoomChange = false;
		}
		if (this.isSetBounds && window.viewer) {
			window.viewer.viewport.goHome(true);
			this.isSetBounds = false;
		}
	}

	toggleLabel(switchValue) {
		for (let i = 0; i < this.treeannotations.length; i++) {
			for (let j = 0; j < this.treeannotations[i].data.length; j++) {
				let annotation = this.layer.annotationById(this.treeannotations[i].data[j].geoid);
				if (!switchValue)
					annotation.options("showLabel", switchValue);
				else {
					if (this.treeannotations[i].data[j].checked)
						annotation.options("showLabel", switchValue);
					else
						annotation.options("showLabel", false);
				}
				window.map.draw();
			}
		}
	}

	resetDataStructures(boolValue) {
		if (this.layer != null) {
			this.reinitializeTreeLayers(boolValue);
			this.layer.removeAllAnnotations();
			this.layer.geojson({}, true);
			window.map.draw();
		}
	}

	getMetadataAndLoadAnnotations() {
		let url = webix.serverURL + "/item/" + this.slide.item._id;
		webix.ajax().get(url, (text) => {
			this.resetDataStructures();
			this.currentSlide = JSON.parse(text);
			if (typeof this.currentSlide !== "undefined") {
				if (typeof this.currentSlide.meta !== "undefined") {
					let allShapesLength = 0;
					if (typeof this.currentSlide.meta.dsalayers !== "undefined") {
						if (!this.isEmpty(this.currentSlide.meta.dsalayers) && this.currentSlide.meta.dsalayers.length > 0) {
							this.treeannotations.length = 0;
							this.dsalayers = this.treeannotations = this.currentSlide.meta.dsalayers;

							for (let i = 0; i < this.dsalayers.length; i++) {
								allShapesLength += this.dsalayers[i].data.length;
							}
							let geoIdArray = [], labelId = [];

							for (let i = 0; i < this.dsalayers.length; i++) {
								for (let j = 0; j < this.dsalayers[i].data.length; j++) {
									geoIdArray.push(this.dsalayers[i].data[j].geoid);
									if (this.dsalayers[i].data[j].labelId)
										labelId.push(this.dsalayers[i].data[j].labelId);
								}
							}

							Array.max = function (array) {
								return Math.max.apply(Math, array);
							};
							if (labelId.length != 0) {
								labelId = labelId.sort();
								this.lastLabelNumber = labelId[labelId.length - 1];
							}
							else if (geoIdArray.length != 0)
								this.lastLabelNumber = Array.max(geoIdArray);
							else this.lastLabelNumber = 0;

							if (this.dsalayers)
								this.reloadAnnotationsTable();
						} else
							this.reinitializeTreeLayers();
					}

					//Reload existing annotations.
					if (this.currentSlide.meta.hasOwnProperty("geojslayer") && !this.isEmpty(this.currentSlide.meta.geojslayer)) {
						if (this.currentSlide.meta.geojslayer.features && !this.isEmpty(this.currentSlide.meta.geojslayer.features)) {
							let features = this.currentSlide.meta.geojslayer.features;
							if (allShapesLength > features.length) {
								for (let i = 0; i < this.dsalayers.length; i++) {
									for (let j = 0; j < this.dsalayers[i].data.length; j++) {
										let count = 0;
										for (let k = 0; k < features.length; k++) {
											if (this.dsalayers[i].data[j].geoid != features[k].properties.annotationId) {
												count++;
											}
										}
										if (count == features.length) {
											this.dsalayers[i].data.splice(j, 1);
											j = j - 1;
										}
									}
									if (this.dsalayers[i].data.length == 0) {
										this.dsalayers.splice(i, 1);
										i = i - 1;
									}

								}
							}
							let geojsJSON = this.geoJSON = this.currentSlide.meta.geojslayer;
							this.layer.geojson(geojsJSON, "update");
						}
					}
					else {
						this.geoJSON = {};
						this.layer.geojson(this.geoJSON, "update");
					}
				}
				else {
					this.geoJSON = {};
					this.layer.geojson({}, "update");
				}
			}
			this.treeCheckBoxesClicked();
		});
	}

	reloadAnnotationsTable() {
		let updateStringArray = JSON.stringify(this.treeannotations);
		let tempJSONArray = JSON.parse(updateStringArray);
		this.app.callEvent("annotationTableParse", [tempJSONArray]);
		this.app.callEvent("changeRichselectData", [this.treeannotations]);
	}

	newAnnotation(evt) {
		let idArray = [];
		let annotationLabelNumber;
		const annotationsArray = window.annotationLayer.annotations();
		for (let i = 0; i < annotationsArray.length; i++) {
			if (annotationsArray[i].id() != evt.annotation.id())
				idArray.push(annotationsArray[i].id());
		}
		Array.max = function (array) {
			return Math.max.apply(Math, array);
		};

		if (idArray.length != 0) {
			let lastId = Array.max(idArray);
			let currentLayerIndex = 0;
			for (let i = 0; i < window.that.treeannotations.length; i++) {
				if (window.that.treeannotations[i].id == window.that.currentLayerId) {
					currentLayerIndex = i;
					for (let j = 0; j < window.that.treeannotations[i].data.length; j++) {
						if (window.that.treeannotations[i].data[j].geoid == lastId
							&& window.that.treeannotations[i].data[j].hasOwnProperty("labelId")) {
							annotationLabelNumber = window.that.treeannotations[i].data[j].labelId + 1;
							break;
						}
					}
					if (!annotationLabelNumber && window.that.treeannotations[currentLayerIndex].data.length != 0) {
						if (window.that.treeannotations[currentLayerIndex].data[window.that.treeannotations[currentLayerIndex].data.length - 1].hasOwnProperty("labelId"))
							annotationLabelNumber = window.that.treeannotations[currentLayerIndex].data[window.that.treeannotations[currentLayerIndex].data.length - 1].labelId + 1;
					}
				}
				if (annotationLabelNumber)
					break;
			}
			if (!annotationLabelNumber && window.that.treeannotations[currentLayerIndex].data.length != 0)
				annotationLabelNumber = idArray[idArray.length - 1] + 1;
			else if (!annotationLabelNumber)
				annotationLabelNumber = 1;
		}
		else
			annotationLabelNumber = 1;
		if (window.that.lastLabelNumber < annotationLabelNumber)
			window.that.lastLabelNumber = annotationLabelNumber;
		else window.that.lastLabelNumber += 1;

		document.querySelector("#geojs .geojs-layer").style.pointerEvents = "none";

		let newAnnotationTree = {
			id: window.that.currentLayerId + "." + annotationLabelNumber,
			labelId: annotationLabelNumber,
			geoid: evt.annotation.id(),
			value: evt.annotation.type()[0].toUpperCase() + evt.annotation.type().substring(1) + " " + window.that.lastLabelNumber,
			type: evt.annotation.type(),
			fillColor: "#00FF00",
			checked: true,
			fillOpacity: evt.annotation.options("style").fillOpacity,
			strokeColor: "#000000",
			strokeOpacity: evt.annotation.options("style").strokeOpacity,
			strokeWidth: evt.annotation.options("style").strokeWidth
		};

		evt.annotation.label(evt.annotation.type()[0].toUpperCase() + evt.annotation.type().substring(1) + " " + window.that.lastLabelNumber);
		for (let i = 0; i < window.that.treeannotations.length; i++) {
			if (window.that.treeannotations[i].id === window.that.currentLayerId) {
				window.that.treeannotations[i].data.push(newAnnotationTree);
			}
		}
		let updateStringArray = JSON.stringify(window.that.treeannotations);
		let tempJSONArray = JSON.parse(updateStringArray);
		window.that.app.callEvent("annotationTableParse", [tempJSONArray]);
		window.that.app.callEvent("changeRichselectData", [window.that.treeannotations]);
		window.that.treeCheckBoxesClicked("", "", null, window.that.treeannotations);
		window.that.updateGirderWithAnnotationData();
		window.that.toggleLabel(window.switchLabel);
		window.that.isAnnotationAdd = true;
	}

	updateGirderWithAnnotationData(table, item) {
		let updateStringArray = JSON.stringify(this.treeannotations);
		let tempJSONArray = JSON.parse(updateStringArray);
		this.app.callEvent("annotationTableParse", [tempJSONArray, item]);
		this.app.callEvent("changeRichselectData", [this.treeannotations]);

		let annots = this.layer.annotations();
		let geojsannotations = [];
		for (let i = 0; i < annots.length; i++) {
			let anno = {
				type: annots[i].type(),
				features: annots[i].features()
			};
			geojsannotations[i] = anno;
		}

		let geojsonObj = this.layer.geojson(undefined, undefined, undefined, true);

		let metaInfo = {
			dsalayers: this.treeannotations,
			geojslayer: geojsonObj
		};

		this.geoJSON = geojsonObj;
		this.dsalayers = metaInfo.dsalayers;

		let url = webix.serverURL + "/item/" + this.slide.item._id;

		webix.ajax().put(url, { "metadata": metaInfo })
			.then(() => {
				webix.message("Changes are successfully saved");
			})
			.fail((err) => {
				const responseText = JSON.parse(err.responseText);
				const errMessage = responseText.message;
				webix.message({
					type: "debug",
					text: errMessage
				});
			});
	}

	treeCheckBoxesClicked(table, labelsBool, checkedIds, treeannotations) {
		if (table) {
			let checkedIds = table.getChecked();
			this.selectedData = checkedIds;
			for (let i = 0; i < this.treeannotations.length; i++) {
				for (let j = 0; j < this.treeannotations[i].data.length; j++) {
					if (checkedIds.includes(this.treeannotations[i].id))
						this.treeannotations[i].checked = true;
					else
						this.treeannotations[i].checked = false;
					let annotation = this.layer.annotationById(this.treeannotations[i].data[j].geoid);
					if (checkedIds.includes(this.treeannotations[i].data[j].id)) {
						this.treeannotations[i].data[j].checked = true;
						annotation.options("showLabel", labelsBool);
						if (this.treeannotations[i].data[j].type == "line") {
							annotation.style({ strokeOpacity: 1 });
						} else {
							annotation.style({ fill: true, stroke: true });
						}
					} else {
						this.treeannotations[i].data[j].checked = false;
						annotation.options("showLabel", false);
						if (this.treeannotations[i].data[j].type == "line") {
							annotation.style({ strokeOpacity: 0 });
						} else {
							annotation.style({ fill: false, stroke: false });
						}
					}
					window.map.draw();
				}
			}
		}
		else if (checkedIds) {
			for (let i = 0; i < this.treeannotations.length; i++) {
				for (let j = 0; j < this.treeannotations[i].data.length; j++) {
					let annotation = this.layer.annotationById(this.treeannotations[i].data[j].geoid);
					if (this.treeannotations[i].data[j].checked) {
						annotation.options("showLabel", window.switchLabel);
						if (this.treeannotations[i].data[j].type == "line") {
							annotation.style({ strokeOpacity: 1 });
						} else {
							annotation.style({ fill: true, stroke: true });
						}
					}
					else {
						annotation.options("showLabel", false);
						if (this.treeannotations[i].data[j].type == "line") {
							annotation.style({ strokeOpacity: 0 });
						} else {
							annotation.style({ fill: false, stroke: false });
						}
					}
					window.map.draw();
				}
			}
		}
		else if (treeannotations) {
			for (let i = 0; i < this.treeannotations.length; i++) {
				let count = 0;
				for (let j = 0; j < this.treeannotations[i].data.length; j++) {
					if (this.treeannotations[i].data[j].checked)
						count++;
				}
				if (count == this.treeannotations[i].data.length)
					this.treeannotations[i].checked = true;
				else
					this.treeannotations[i].checked = false;
			}
		}
		else {
			for (let i = 0; i < this.treeannotations.length; i++) {
				for (let j = 0; j < this.treeannotations[i].data.length; j++) {
					const annotation = this.layer.annotationById(this.treeannotations[i].data[j].geoid);
					this.treeannotations[i].data[j].checked = false;
					annotation.options("showLabel", false);
					if (this.treeannotations[i].data[j].type == "line") {
						annotation.style({ strokeOpacity: 0 });
					}
					else {
						annotation.style({ fill: false, stroke: false });
					}
					window.map.draw();
				}
				this.treeannotations[i].checked = false;
			}
			this.reloadAnnotationsTable();
		}
	}

	reinitializeTreeLayers(boolValue) {
		if (boolValue) return;
		this.treeannotations.length = 0;
		this.treeannotations = [{
			"id": "1",
			"value": "Default Layer",
			// "checked": true,
			"type": "layer",
			"fillColor": "#00FF00",
			"strokeColor": "#000000",
			"open": true,
			"data": []
		}];
		this.reloadAnnotationsTable();
		this.treeCheckBoxesClicked(this.table);
	}


	propertiesEdited(property, geoid, value, editorcolumn, table, type) {
		let found = false;
		let visibleAnnotationsChanged = false;
		let item = null;
		for (var i = 0; i < this.treeannotations.length; i++) {
			if (property === "deleteLayer") {
				if (this.treeannotations[i].id === geoid) {
					this.treeannotations.splice(i, 1);
					visibleAnnotationsChanged = true;
					this.reloadAnnotationsTable();

					if (this.treeannotations.length === 0) {
						webix.message("All the layers were deleted. Initializing it to default layer...");
						this.reinitializeTreeLayers();
						this.lastLabelNumber = 0;
					}
					break;
				}
			} else {
				for (var j = 0; j < this.treeannotations[i].data.length; j++) {
					if (this.treeannotations[i].data[j].geoid == geoid) {
						item = this.treeannotations[i].data[j];
						switch (property) {
							case "strokeWidth":
								this.treeannotations[i].data[j].strokeWidth = value;
								break;
							case "fillOpacity":
								this.treeannotations[i].data[j].fillOpacity = value;
								break;
							case "strokeOpacity":
								this.treeannotations[i].data[j].strokeOpacity = value;
								break;
							case "deleteAnnotation":
								this.treeannotations[i].data.splice(j, 1);
								item = null;
								visibleAnnotationsChanged = true;
								break;
							case "annotationStyleChange":
								switch (editorcolumn) {
									case "fillColor":
										this.treeannotations[i].data[j].fillColor = value;
										break;
									case "strokeColor":
										this.treeannotations[i].data[j].strokeColor = value;
										break;
									case "name":
										this.treeannotations[i].data[j].value = value;
										break;
								}
								break;
						}
						found = true;
						break;
					}
				}
				if (found) {
					break;
				}
			}
		}
		if (!type)
			this.updateGirderWithAnnotationData(table, item);
		if (visibleAnnotationsChanged) {
			this.treeCheckBoxesClicked(table);
		}
	}


	isEmpty(obj) {
		for (let prop in obj) {
			if (obj.hasOwnProperty(prop))
				return false;
		}
		return JSON.stringify(obj) === JSON.stringify({});
	}

}