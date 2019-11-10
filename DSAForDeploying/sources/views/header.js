import { JetView } from "webix-jet";
import LoginPopupView from "./loginPopup";
import User from "../models/session";
import { firstLogoImg, secondLogoImg, helpWindowsConfig } from "../appConfig";
import HelpWindow from "./helpWindow";
import constants from "../constants";


export default class HeaderView extends JetView {
	config() {
		const header = {
			cols: [
				{ template: `<img src="${firstLogoImg}">`, width: 190, borderless: true },
				{
					template: () => {
						if (secondLogoImg)
							return `<img src="${secondLogoImg}">`;
						else return "";
					},
					borderless: true
				},
				{
					cols: [
						{
							view: "button",
							name: "loginButton",
							value: "login".toUpperCase(),
							css: "login_button white_button",
							inputHeight: 45,
							inputWidth: 115,
							width: 115,
							click: () => {
								const user = new User();
								const information = user.getUserInformation();
								const buttonValue = this.getRoot().queryView({ name: "loginButton" }).getValue().toLowerCase();
								if (buttonValue == "login" && !information)
									this._loginPopup.showWindow();
								else if (buttonValue == "logout" && information) {
									user.logout();
									this.app.callEvent("refreshLoginButton", ["login"]);
								}
							},
							// disabled: true
						},
						{
							view: "menu",
							width: 250,
							data: [
								{ value: "help".toUpperCase(), submenu: Object.values(constants.HELP_SUBMENU_VALUES) },
								{
									value: "tcga resources".toUpperCase(),
									href: "https://tcga-data.nci.nih.gov/docs/publications/tcga/",
									target: "_blank"
								}
							],
							type: {
								height: 35
							},
							css: "header_menu",
							on: {
								onMenuItemClick: (id, e) => {
									switch(id) {
										case constants.HELP_SUBMENU_VALUES.ABOUT: {
											this._aboutProjectPopup.showWindow();
											break;
										}
										case constants.HELP_SUBMENU_VALUES.REPOSITORY_STATS: {
											this._repoStatsPopup.showWindow();
											break;
										}
									}
								}
							}
						}
					],
					paddingY: 7
				}
			],
			height: 80,
			padding: 10,
			css: "main_header_container"
		};

		return header;
	}

	init() {
		const user = new User();
		const information = user.getUserInformation();
		let value = "";
		if (information)
			value = "logout";
		else
			value = "login";

		this._aboutProjectPopup = this.ui(new HelpWindow(this.app, "", helpWindowsConfig.about));
		this._repoStatsPopup = this.ui(new HelpWindow(this.app, "", helpWindowsConfig.repositoryStats));

		this.getRoot().queryView({ name: "loginButton" }).setValue(value.toUpperCase());
		this._loginPopup = this.ui(LoginPopupView);

		this.on(this.app, "refreshLoginButton", (value) => {
			this.getRoot().queryView({ name: "loginButton" }).setValue(value.toUpperCase());
		});

		this.on(this.app, "enabledLoginButton", () => {
			if (!this.getRoot().queryView({ name: "loginButton" }).isEnabled())
				this.getRoot().queryView({ name: "loginButton" }).enable();
		});
	}
}