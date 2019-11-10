import {JetView} from "webix-jet";
import constants from "../constants";

export default class TreeContextMenu extends JetView {
	config() {
		const contextMenu = {
			view: "contextmenu",
			width: 175,
			data: [
				{$template: "Separator"},
				constants.LINEAR_CONTEXT_MENU_ID,
				{$template: "Separator"}
			]
		};

		return contextMenu;
	}
}
