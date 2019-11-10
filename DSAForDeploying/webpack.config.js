var path = require("path");
var webpack = require("webpack");
var CopyWebpackPlugin = require("copy-webpack-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var projectConfig = require("./config");

module.exports = function(env) {

	var pack = require("./package.json");
	var MiniCssExtractPlugin = require("mini-css-extract-plugin");

	var production = !!(env && env.production === "true");
	var asmodule = !!(env && env.module === "true");
	var standalone = !!(env && env.standalone === "true");

	var babelSettings = {
		extends: path.join(__dirname, "/.babelrc")
	};

	var config = {
		mode: production ? "production" : "development",
		entry: {
			myapp: "./sources/myapp.js"
		},
		output: {
			path: path.join(__dirname, "codebase"),
			publicPath: "",
			filename: "[name].js",
			chunkFilename: "[name].bundle.js"
		},
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude(modulePath) {
						return /node_modules/.test(modulePath) &&
							!/node_modules[\\/]webix-jet/.test(modulePath) &&
							!/node_modules[\\/]webpack-dev-server/.test(modulePath);
					},
					use: "babel-loader?" + JSON.stringify(babelSettings)
				},
				{
					test: /\.html$/,
					exclude: /node_modules/,
					use: {loader: "html-loader"}
				},
				{
					test: /\.(svg|png|jpg|gif)$/,
					use: "url-loader?limit=25000"
				},
				{
					test: /\.(less|css)$/,
					use: [ MiniCssExtractPlugin.loader, "css-loader", "less-loader" ]
				}
			]
		},
		stats:"minimal",
		resolve: {
			extensions: [".js"],
			modules: ["./sources", "node_modules"],
			alias:{
				"jet-views":path.resolve(__dirname, "sources/views"),
				"jet-locales":path.resolve(__dirname, "sources/locales")
			}
		},
		plugins: [
			new MiniCssExtractPlugin({
				filename:"[name].css"
			}),
			new webpack.DefinePlugin({
				VERSION: `"${pack.version}"`,
				APPNAME: `"${pack.name}"`,
				PRODUCTION : production,
				BUILD_AS_MODULE : (asmodule || standalone)
			}),
			new CopyWebpackPlugin([
				{ from: path.join(__dirname, "node_modules/openseadragon"), to: "node_modules/openseadragon" },
				{ from: path.join(__dirname, "node_modules/webix"), to: "node_modules/webix" },
				{ from: path.join(__dirname, "plugin/"), to: "plugin/" },
				{ from: path.join(__dirname, "img/"), to: "img/" }
			]),
			new HtmlWebpackPlugin({
				template: "index.html",
				GAScriptId: projectConfig.GOOGLE_ANALYTICS_ID
			}),
			new webpack.EnvironmentPlugin({
				VARIABLES: projectConfig
			})
		],
		devServer:{
			stats:"errors-only"
		}
	};

	if (!production){
		config.devtool = "inline-source-map";
	}

	if (asmodule){
		if (!standalone){
			config.externals = config.externals || {};
			config.externals = [ "webix-jet" ];
		}

		const out = config.output;
		const sub = standalone ? "full" : "module";

		out.library = pack.name.replace(/[^a-z0-9]/gi, "");
		out.libraryTarget= "umd";
		out.path = path.join(__dirname, "dist", sub);
		out.publicPath = "/dist/"+sub+"/";
	}

	return config;
};
