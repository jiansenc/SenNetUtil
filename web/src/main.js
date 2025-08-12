import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./styles/index.css";
import App from "./App.vue";
import router from "./routers";
import "highlight.js/styles/github.css";
import * as Utils from "./utils/index.js";

// Utils注册到全局

window.Utils = Utils;
// 创建Vue应用
const app = createApp(App);

// 使用插件
app.use(router);
app.use(ElementPlus, { size: "small" });

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
	console.error("Vue全局错误:", err);
	console.error("发生位置:", info);
};

// 挂载应用
app.mount("#app");
