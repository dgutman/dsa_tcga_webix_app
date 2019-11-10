import { JetView } from "webix-jet";

export default class HelpWindow extends JetView {
	constructor(app, name, config) {
		super(app, name);
		this._settings = config;
	}
	config() {

		const window = {
			view: "window",
			height: 700,
			width: 1000,
			resize: true,
			position: "center",
			move: true,
			head: {
				view: "toolbar",
				borderless: true,
				padding: 10,
				cols: [
					{ view: "label", label: this._settings.label || "" },
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
				template: () => {
					return this._settings.content;
				}
			}
		};

		return window;
	}

	showWindow() {
		this.getRoot().show();
	}

	hideWindow() {
		this.getRoot().hide();
	}
}