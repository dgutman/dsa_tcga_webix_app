webix.protoUI({
	name: "counterObj",
	$setValue: function (value) {
		this.getInputNode().value = value;
	},
	$prepareValue: function (value) {
		value = parseFloat(value).toFixed(2).replace(/(\.0+|0+)$/, "");
		return isNaN(value) ? 0 : value;
	},
	setValue: function (value) {
		if (!/^[0-9\.]+$/.test(value) || value > this.config.max || value < this.config.min) {
			this.$setValue(this.config.min);
			return webix.ui.text.prototype.setValue.call(this, this.config.min);
		}
		return webix.ui.text.prototype.setValue.call(this, value);
	},
	shift: function (step) {
		var min = this.config.min;
		var max = this.config.max;
		var new_value = this.getValue() + step;
		new_value = parseFloat(new_value.toFixed(2));
		if (new_value >= min && new_value <= max) this.setValue(new_value);
	},
	getValue: function () {
		return isNaN(this.getInputNode().value) ? this.getInputNode().value : parseFloat(this.getInputNode().value);
	},
}, webix.ui.counter);

