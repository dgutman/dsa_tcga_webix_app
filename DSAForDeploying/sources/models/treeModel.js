let realScrollPosition;

function setRealScrollPosition(position) {
	realScrollPosition = position;
}

function isObjectEmpty(obj) {
	for (let prop in obj) {
		if (obj.hasOwnProperty(prop)) { return false; }
	}
	return true;
}

function defineSizesAndPositionForDynamicScroll(treeFolder, tree) {
	let branchesArray = [];
	let viewClientHeight = 0;
	let countBottom = false;

	const branchScrollHeight = tree.getItemNode(treeFolder.id).nextSibling.scrollHeight;
	const branchesHTMLCollection = tree.getNode().querySelectorAll("div[webix_tm_id]");
	branchesArray = Array.from(branchesHTMLCollection);
	branchesArray.some((branchNode) => {
		let branchId = branchNode.attributes.webix_tm_id.nodeValue;
		const branchClientHeight = branchNode.clientHeight;
		if (parseInt(branchId) === treeFolder.id) {
			countBottom = true;
			return countBottom;
		}
		if (!countBottom) {
			viewClientHeight += branchClientHeight;
		}
	});
	return viewClientHeight + branchScrollHeight + 28;
}

function attachOnScrollEvent(scrollState, treeFolder, tree) {
	const difference = realScrollPosition - (tree.$height + scrollState.y);
	if (difference <= 0 && difference >= -200) {
		tree.blockEvent();
		const count = treeFolder.$count;
		const sourceParams = {
			offset: count,
			type: treeFolder._modelType
		};

		tree.showProgress();
		tree.$scope.getLinearStucture(treeFolder._id, sourceParams)
			.then(data => data.json())
			.then((data) => {
				if (!isObjectEmpty(data)) {
					let folderCount = treeFolder.$count;
					data.forEach((itemData) => {
						itemData.file = true;
						tree.add(itemData, folderCount, treeFolder.id);
						folderCount++;
					});

					setRealScrollPosition(defineSizesAndPositionForDynamicScroll(treeFolder, tree));
				}
				else {
					tree.detachEvent("onAfterScroll");
				}
				tree.unblockEvent();
				tree.hideProgress();
			})
			.fail(() => {
				tree.unblockEvent();
				tree.hideProgress();
			});
	}
}

export default {
	defineSizesAndPositionForDynamicScroll,
	attachOnScrollEvent,
	setRealScrollPosition
};
