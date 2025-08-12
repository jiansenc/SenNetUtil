window.callFunction = {};
export const IMG = (path) => {
	return new URL(path, import.meta.url).href;
};

export const callWebview = (type, data) => {
	chrome?.webview.postMessage({ type, data });
};

// 创建随机数
export const createRandomId = () => {
	return (
		Math.random().toString(36).substring(2, 15) +
		Math.random().toString(36).substring(2, 15)
	);
};

export const callWebviewSync = (type, data, callback) => {
	const callId = createRandomId();
	window.callFunction[callId] = (response) => {
		console.log("触发回调" + callId);
		callback(response);
		delete window.callFunction[callId];
	};
	chrome?.webview.postMessage({
		type: "callFunction",
		eventType: type,
		callId: callId,
		data: data,
	});
};

// 生成 UUID
export const generateUUID = () => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};
