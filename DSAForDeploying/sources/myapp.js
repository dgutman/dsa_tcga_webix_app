import "./styles/app.css";
import { JetApp, EmptyRouter, HashRouter } from "webix-jet";
import User from "./models/session";
import { mainViewPath } from "./appConfig";

export default class MyApp extends JetApp {
	constructor(config) {
		const defaults = {
			id: APPNAME,
			version: VERSION,
			router: HashRouter,
			debug: !PRODUCTION,
			start: mainViewPath,
			views: {
				[mainViewPath] : "mainMockup"
			}
		};

		super({ ...defaults, ...config });
	}
}

webix.ready(() => {
	new MyApp().render();
	webix.attachEvent("onBeforeAjax",
		function (mode, url, data, request, headers, files, promise) {
			const user = new User();
			if (user.getUserInformation())
				headers["Girder-Token"] = user.token();
		}
	);

	window.showAttentionPopup = function (func) {
		const user = new User();
		if (!user.token())
			webix.alert({
				title: "Attention",
				ok: "OK",
				type: "confirm-warning",
				text: "In order to save your changes, please, log in application. Changes of not logged in users can not be saved."
			}).then(() => {
				if (func)
					func();
			});
		else if (func) func();
	};
});