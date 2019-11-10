import { JetView } from "webix-jet";
import User from "../models/session";

export default class LoginPopupView extends JetView {
	config() {

		const login_form = {
			view: "form",
			rules: {
				$all: webix.rules.isNotEmpty
			},
			elements: [
				{ view: "text", label: "Username", labelPosition: "top", name: "login", invalidMessage: "Username can not be empty" },
				{ view: "text", type: "password", label: "Password", labelPosition: "top", name: "password", invalidMessage: "Password can not be empty" },
				{
					cols: [
						{
							view: "button",
							value: "Login",
							type: "form",
							hotkey: "enter",
							click: () => {
								const form = this.getRoot().queryView({ view: "form" });
								if (form.validate()) {
									const formValues = form.getValues();
									const user = new User();
									user.login(formValues).then(() => {
										this.hideWindow();
										this.app.callEvent("refreshLoginButton", ["logout"]);
										window.location.reload();
									}, (err) => {
										webix.message({ type: "error", text: `Error: ${err.statusText}` });
									});
								}
							}
						},
						{ width: 12 },
						{
							view: "button",
							value: "Cancel",
							click: () => {
								this.hideWindow();
							}
						}
					]
				}
			]
		};

		const popup = {
			view: "window",
			width: 350,
			position: "center",
			head: "Login",
			modal: true,
			body: login_form
		};

		return popup;
	}

	showWindow() {
		this.getRoot().show();
	}

	hideWindow() {
		this.getRoot().hide();
	}
}