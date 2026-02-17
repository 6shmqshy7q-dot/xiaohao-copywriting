/**
 * AI 小红书文案生成器 - 前端 JavaScript
 */

// DOM 元素
const topicInput = document.getElementById('topic');
const styleSelect = document.getElementById('style');
const generateBtn = document.getElementById('generateBtn');
const outputDiv = document.getElementById('output');
const copyBtn = document.getElementById('copyBtn');

// 事件监听
generateBtn.addEventListener('click', startGeneration);
copyBtn.addEventListener('click', copyToClipboard);

// 按 Enter 快捷键生成（Ctrl/Cmd + Enter）
topicInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        startGeneration();
    }
});

/**
 * 开始生成文案
 */
async function startGeneration() {
    const topic = topicInput.value.trim();

    if (!topic) {
        showToast('请输入文案主题');
        topicInput.focus();
        return;
    }

    // 禁用按钮，显示加载状态
    setGeneratingState(true);

    // 清空输出区域
    outputDiv.innerHTML = '';
    copyBtn.style.display = 'none';

    try {
        // 发送请求获取流式响应
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic: topic,
                style: styleSelect.value
            })
        });

        if (!response.ok) {
            throw new Error(`请求失败: ${response.status}`);
        }

        // 处理流式响应
        await handleStreamingResponse(response);

    } catch (error) {
        console.error('生成失败:', error);
        outputDiv.innerHTML = `<p class="error">❌ 生成失败: ${error.message}</p>`;
    } finally {
        // 恢复按钮状态
        setGeneratingState(false);
        // 显示复制按钮
        if (outputDiv.textContent.trim() !== '') {
            copyBtn.style.display = 'block';
        }
    }
}

/**
 * 处理流式响应
 */
async function handleStreamingResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        // 解码数据
        const chunk = decoder.decode(value, { stream: true });

        // 解析 SSE 格式的数据
        const lines = chunk.split('\n\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));

                    if (data.error) {
                        throw new Error(data.error);
                    }

                    if (data.content) {
                        // 逐字添加到结果中
                        result += data.content;
                        renderContent(result);
                    }
                } catch (e) {
                    console.error('解析响应数据失败:', e);
                }
            }
        }
    }
}

/**
 * 渲染内容（打字机效果）
 */
function renderContent(text) {
    // 移除 placeholder
    const placeholder = outputDiv.querySelector('.placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    // 添加内容
    const span = document.createElement('span');
    span.textContent = text;

    // 添加光标效果
    span.classList.add('typing-cursor');

    outputDiv.innerHTML = '';
    outputDiv.appendChild(span);

    // 滚动到底部
    outputDiv.scrollTop = outputDiv.scrollHeight;
}

/**
 * 设置生成状态
 */
function setGeneratingState(isGenerating) {
    generateBtn.disabled = isGenerating;
    generateBtn.querySelector('.btn-text').style.display = isGenerating ? 'none' : 'inline';
    generateBtn.querySelector('.btn-loading').style.display = isGenerating ? 'inline' : 'none';
    topicInput.disabled = isGenerating;
    styleSelect.disabled = isGenerating;
}

/**
 * 复制文案到剪贴板
 */
async function copyToClipboard() {
    const text = outputDiv.textContent.replace('|', '').trim();

    if (!text) {
        showToast('没有可复制的内容');
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast('✅ 复制成功！');

        // 按钮反馈
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ 已复制';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('复制失败:', error);
        showToast('❌ 复制失败');
    }
}

/**
 * 显示提示消息
 */
function showToast(message) {
    // 移除已存在的 toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // 创建新的 toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 显示
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 2秒后隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
