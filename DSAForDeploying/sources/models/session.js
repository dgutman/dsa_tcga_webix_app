import { appSettings } from "../appConfig";

export default class User {

	login(formValues) {
		return webix.ajax().headers({
			Authorization: "Basic " + btoa(unescape(encodeURIComponent(formValues.login + ":" + formValues.password)))
		}).get(`${appSettings.serverApiURL}/user/authentication`).then((data) => {
			webix.storage.local.put("Girder-Token", data.text());
		});
	}

	getUserInformation() {
		return webix.storage.local.get("Girder-Token");
	}

	logout() {
		webix.storage.local.remove("Girder-Token");
		window.location.reload();
	}

	token() {
		const value = JSON.parse(webix.storage.local.get("Girder-Token"));
		if (value)
			return value.authToken.token;
		else return null;
	}
}