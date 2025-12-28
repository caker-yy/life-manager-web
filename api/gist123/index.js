const fetch = require('node-fetch');

// 与前端一致的 Gist 配置
const GIST_IDS = {
    users: 'ab5500b945df60aa28d096bdd1a92ec9',
    posts: 'eaa6ddac14c387164a73dc1e1f8fcec3',
    tips: 'e82bcf2938aecfac6931ef2a73187cc4',
    resources: 'a0b2f46e61c1e2cc78318fb3def41b03'
};
const GIST_FILENAMES = {
    users: 'life-manager-users.json',
    posts: 'life-manager-posts.json',
    tips: 'life-manager-tips.json',
    resources: 'life-manager-resources.json'
};

module.exports = async function (context, req) {
    // 1. 跨域配置（解决前端预检请求）
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    };

    // 2. 处理 OPTIONS 预检请求（必加，否则报 405）
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        context.res.body = { success: true };
        return;
    }

    try {
        // 3. 读取请求参数
        const { gistType, method, content } = req.body;
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // 读取 Azure 环境变量

        // 4. 校验参数
        if (!gistType || !method) {
            context.res = { ...context.res, status: 400, body: { success: false, message: '缺少 gistType 或 method' } };
            return;
        }
        if (!GITHUB_TOKEN) {
            context.res = { ...context.res, status: 500, body: { success: false, message: '未配置 GITHUB_TOKEN 环境变量' } };
            return;
        }
        if (!['users', 'posts', 'tips', 'resources'].includes(gistType)) {
            context.res = { ...context.res, status: 400, body: { success: false, message: '无效的 gistType' } };
            return;
        }

        // 5. 调用 GitHub Gist API
        const gistId = GIST_IDS[gistType];
        const filename = GIST_FILENAMES[gistType];
        const headers = {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        let githubResponse;
        // 5.1 获取 Gist 内容
        if (method === 'GET') {
            githubResponse = await fetch(`https://api.github.com/gists/${gistId}`, { method: 'GET', headers });
        }
        // 5.2 更新 Gist 内容
        else if (method === 'PATCH') {
            const contentToSave = { success: true, data: Array.isArray(content) ? content : [] };
            githubResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    files: { [filename]: { content: JSON.stringify(contentToSave, null, 2) } }
                })
            });
        }
        // 5.3 不支持的方法
        else {
            context.res = { ...context.res, status: 405, body: { success: false, message: '仅支持 GET/PATCH 方法' } };
            return;
        }

        // 6. 处理 GitHub 响应
        if (!githubResponse.ok) {
            const error = await githubResponse.json().catch(() => ({ message: githubResponse.statusText }));
            context.res = { ...context.res, status: githubResponse.status, body: { success: false, message: error.message } };
            return;
        }

        // 7. 返回成功响应
        const gistData = await githubResponse.json();
        context.res = { ...context.res, status: 200, body: gistData };

    } catch (error) {
        // 8. 全局错误捕获
        context.res = { ...context.res, status: 500, body: { success: false, message: `服务器错误：${error.message}` } };
        context.log.error('函数错误：', error);
    }
};