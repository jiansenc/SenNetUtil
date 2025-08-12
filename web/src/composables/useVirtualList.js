import { ref, computed, watch } from "vue";

/**
 * 虚拟列表钩子函数，用于处理大量数据的高性能渲染
 * @param {Object} options 配置选项
 * @param {Array|Ref<Array>} options.data 要显示的完整数据列表
 * @param {Number} options.itemHeight 每项的高度（像素）
 * @param {Number} options.visibleItems 可视区域能显示的最大项目数
 * @param {Number} options.buffer 上下缓冲区域的项目数，防止滚动时出现白屏
 */
export function useVirtualList(options) {
	// 默认配置
	const { itemHeight = 30, visibleItems = 100, buffer = 20 } = options;

	// 状态
	const startIndex = ref(0);
	const scrollTop = ref(0);
	const visibleData = ref([]);

	// 计算总列表高度，确保滚动条正常工作
	const totalHeight = computed(() => {
		if (!options.data) return 0;
		const dataLength = Array.isArray(options.data)
			? options.data.length
			: options.data.value?.length || 0;
		return dataLength * itemHeight;
	});

	// 计算当前可见数据
	const updateVisibleData = () => {
		if (!options.data) {
			visibleData.value = [];
			return;
		}

		const data = Array.isArray(options.data)
			? options.data
			: options.data.value || [];
		const start = Math.max(0, startIndex.value - buffer);
		const end = Math.min(data.length, startIndex.value + visibleItems + buffer);

		visibleData.value = data.slice(start, end).map((item, index) => ({
			...item,
			__virtualIndex: start + index,
			__virtualTop: (start + index) * itemHeight,
		}));
	};

	// 处理滚动事件
	const handleScroll = (event) => {
		scrollTop.value = event.target.scrollTop;
		startIndex.value = Math.floor(scrollTop.value / itemHeight);
		updateVisibleData();
	};

	// 滚动到指定索引
	const scrollToIndex = (index) => {
		if (index < 0) return;

		startIndex.value = index;
		scrollTop.value = index * itemHeight;
		updateVisibleData();

		return {
			top: scrollTop.value,
			behavior: "smooth",
		};
	};

	// 初始更新和数据变化时更新
	watch(
		() =>
			Array.isArray(options.data)
				? options.data.length
				: options.data.value?.length,
		() => {
			updateVisibleData();
		},
		{ immediate: true }
	);

	return {
		visibleData,
		totalHeight,
		startIndex,
		scrollTop,
		handleScroll,
		scrollToIndex,
		updateVisibleData,
	};
}
