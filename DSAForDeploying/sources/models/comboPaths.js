import { mainViewPath } from "../appConfig";

class ComboURLPaths {
	constructor(app, initialPaths) {
		this.app = app;
		this.viewName = mainViewPath;
		this.paths = initialPaths || { folders: [] };
	}

	setURLComboName(comboName, value) {
		this.paths[comboName] = value;
	}

	getURLPaths() {
		return this.paths;
	}

	changeHost(value) {
		this.setURLComboName("host", value);
		delete this.paths.collection;
		this.paths.folders = [];
		return this.setURLPath();
	}

	changeCollection(value) {
		this.setURLComboName("collection", value);
		this.paths.folders = [];
		return this.setURLPath();
	}

	changeFolder(arr) {
		this.paths.folders = arr;
		return this.setURLPath();
	}

	setURLPath() {
		let path = `${this.viewName}`;

		if (this.paths.host) {
			path += `/${this.escapeURICharacters(this.paths.host)}`;
		}

		if (this.paths.collection) {
			path += `/${this.escapeURICharacters(this.paths.collection)}`;
		}

		if (this.paths.folders.length) {
			this.paths.folders.forEach((folder) => {
				path += `/${this.escapeURICharacters(folder)}`;
			});
		}

		this.oldPathString = this.pathString;
		this.pathString = path;
		return this.app.show(path); // Promise
	}

	getPathString(type) {
		switch (type) {
			case "old":
				return this.oldPathString;
			default:
				return this.pathString;
		}
	}

	escapeURICharacters(string) {
		return string.replace(/[;,/?:@&=+$_.!~*'()#-]/g, "");
	}

	compareStrings(str1, str2) {
		str1 = decodeURI(str1);
		str2 = decodeURI(str2);
		if (this.escapeURICharacters(str1) === this.escapeURICharacters(str2)) {
			return true;
		}
		return false;
	}
}


export default ComboURLPaths;
