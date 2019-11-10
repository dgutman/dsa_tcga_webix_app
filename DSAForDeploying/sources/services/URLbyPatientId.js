import { appSettings } from "../appConfig";

function findPatientByPatientId(patientId) {
	const promise = new Promise((resolve, reject) => {
		let folders = [];
		webix.ajax(`${appSettings.serverApiURL}/resource/mongo_search?type=folder&q={"name":"${patientId}", "baseParentId": {"$oid": "${appSettings.initialParentId}"}}`)
			.then(data => data.json())
			.then((data) => {
				return webix.ajax(`${appSettings.serverApiURL}/folder/${data[0]._id}`);
			})
			.then(data => data.json())
			.then((data) => {
				return getUrlByPatientId(data, folders)
					.then((folders) => {
						resolve(folders);
					});
			})
			.catch((err) => {
				reject(err);
			});
	});
	return promise;
}

function getUrlByPatientId(data, folders) {
	if (data.parentId !== appSettings.initialParentId) {
		folders.unshift(data.name);
		return webix.ajax(`${appSettings.serverApiURL}/folder/${data.parentId}`)
			.then(data => data.json())
			.then((data) => {
				if (data.parentId !== appSettings.initialParentId) {
					return getUrlByPatientId(data, folders);
				}
				else {
					folders.unshift(data.name);
					return Promise.resolve(folders);
				}
			});
	}
	else {
		folders.unshift(data.name);
		return Promise.resolve(folders);
	}
}

export default findPatientByPatientId;