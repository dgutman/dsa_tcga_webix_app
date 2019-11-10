import { JetView } from "webix-jet";
import User from "../models/session";

export default class PathologyReportPopup extends JetView {
	config() {

		const popup = {
			view: "window",
			height: 500,
			width: 700,
			resize: true,
			position: "center",
			move: true,
			head: {
				view: "toolbar",
				padding: 10,
				cols: [
					{ view: "label", label: "Pathology Reports" },
					{
						view: "icon",
						icon: "fa fa-times",
						click: () => {
							this.hideWindow();
						}
					}
				]
			},
			body: {
				rows: [
					{
						view: "combo",
						name: "fileNameCombo",
						borderless: true,
						options: {
							body: {
								template: "#name#"
							}
						},
						on: {
							onChange: (id) => {

								let item = this.getRoot().queryView({ name: "fileNameCombo" }).getList().getItem(id);
								let user = new User();
								let pdfviewer = this.getRoot().queryView({ name: "pdfviewer" });
								let token = user.token();

								if (token) {
									pdfviewer.define("template", "");
									let headers = [["Girder-Token", user.token()]];
									let url = `${webix.serverURL}/file/${item._id}/download?contentDisposition=inline`;
									let xhr = new XMLHttpRequest();
									xhr.open("GET", url);
									xhr.onreadystatechange = function () {
										if (this.readyState === this.DONE) {
											if (this.status === 200) {
												// this.response is a Blob, because we set responseType above
												let src = URL.createObjectURL(this.response);
												let template = `<embed id='pdf' src='${src}' width='100%' height='100%'
													pluginspage='http://www.adobe.com/products/acrobat/readstep2.html'>`;
												pdfviewer.define("template", template);
												pdfviewer.refresh();
											} else {
												console.error("XHR failed", this);
											}
										}
									};

									xhr.responseType = "blob";
									headers.forEach(function (header) {
										xhr.setRequestHeader(header[0], header[1]);
									});
									xhr.send();
								}
								else {
									let template = `<embed src='${webix.serverURL}/file/${item._id}/download?contentDisposition=inline' 
									width='100%' height='100%' pluginspage='http://www.adobe.com/products/acrobat/readstep2.html'>`;
									pdfviewer.define("template", template);
									pdfviewer.refresh();
								}
								this.getRoot().show();
							}
						}
					},
					{
						name: "pdfviewer",
						view: "template",
						template: `<embed id='pdf' src='' width='100%' height='100%'
										pluginspage='http://www.adobe.com/products/acrobat/readstep2.html'>`
					}
				]
			},
			on: {
				onViewResize: () => {
					const comboPopup = this.getRoot().queryView({ name: "fileNameCombo" }).getPopup();
					if (comboPopup.isVisible())
						comboPopup.hide();
				}
			}
		};

		return popup;
	}


	async showWindow(item) {
		const combo = this.getRoot().queryView({ name: "fileNameCombo" });
		combo.getList().clearAll();

		const caseId = item.tcga ? item.tcga.caseId : null;
		const PDFPathReport = item.meta ? item.meta.PDFPathReport : null;

		if (caseId) {
			await webix.ajax(`${webix.serverURL}/tcga/pathology?case=${caseId}`)
				.then((data) => {
					data = data.json().data;
					let files = [];
					data.forEach((obj) => {
						var file = obj.file;
						file.value = obj.file.name;
						files.push(file);
					});
					this.parseFiles(files);
				})
				.catch(() => { this.parseFiles([]); });
		}

		if (PDFPathReport) {
			await webix.ajax(`${webix.serverURL}/file/${PDFPathReport}`)
				.then((data) => data.json())
				.then((data) => {
					this.parseFiles(data);
				})
				.catch(() => { this.parseFiles([]); });
		}

		if (!combo.getList().data.count()) {
			webix.message("There are no pathology reports");
		}
	}

	sort(field) {
		return function (a, b) {
			return a[field] > b[field] ? 1 : -1;
		};
	}

	filterUniqueFiles(newFiles) {
		const combo = this.getRoot().queryView({ name: "fileNameCombo" });
		const existedFiles = combo.getList().data.serialize();
		existedFiles.forEach((file) => {
			newFiles = newFiles.filter(item => item._id !== file._id && item.name !== file.name);
		});

		const resultArray =  existedFiles.concat(newFiles);
		return resultArray;
	}

	parseFiles(files) {
		if (!Array.isArray(files)) {
			files = [files];
		}
		files = this.filterUniqueFiles(files);
		if (files.length) {
			const combo = this.getRoot().queryView({ name: "fileNameCombo" });
			files.sort(this.sort("name"));
			combo.getList().parse(files);
			let firstId = combo.getList().getFirstId();
			combo.setValue(firstId);
		}
	}

	hideWindow() {
		const combo = this.getRoot().queryView({ name: "fileNameCombo" });
		combo.getList().clearAll();
		this.getRoot().hide();
	}
}