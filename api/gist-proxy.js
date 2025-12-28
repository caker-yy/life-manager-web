// api/gist-proxy.js（Azure 服务端 API，Token 仅在这里使用）
const fetch = require('node-fetch');

// 从 Azure 服务端环境变量读取 Token（前端不可见）
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
// 允许的 Gist ID（防止滥用）
const ALLOWED_GIST_IDS = {
    users: 'ab5500b945df60aa28d096bdd1a92ec9',
    posts: 'eaa6ddac14c387164a73dc1e1f8fcec3',
    tips: 'e82bcf2938aecfac6931ef2a73187cc4',
    resources: 'a0b2f46e61c1e2cc78318fb3def41b03'
};
// 允许的文件名
const GIST_FILENAMES = {
    users: 'life-manager-users.json',
    posts: 'life-manager-posts.json',
    tips: 'life-manager-tips.json',
    resources: 'life-manager-resources.json'
};

module.exports = async function (context, req) {
    try {
        // 1. 获取前端传参
        const { gistType, method, content } = req.body || {};
        if (!gistType || !ALLOWED_GIST_IDS[gistType]) {
            context.res = { status: 400, body: { message: '无效的 Gist 类型' } };
            return;
        }

        // 2. 构建 GitHub API 请求
        const gistId = ALLOWED_GIST_IDS[gistType];
        const githubUrl = `https://api.github.com/gists/${gistId}`;
        const headers = {
            'Authorization': `token ${GITHUB_TOKEN.trim()}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        let response;
        // 处理 GET（读取）和 PATCH（更新）
        if (method === 'GET') {
            response = await fetch(githubUrl, { method: 'GET', headers });
        } else if (method === 'PATCH') {
            // 包装为统一格式 {"success":true,"data":[]}
            const wrappedContent = {
                success: true,
                data: Array.isArray(content) ? content : []
            };
            response = await fetch(githubUrl, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    files: {
                        [GIST_FILENAMES[gistType]]: {
                            content: JSON.stringify(wrappedContent, null, 2)
                        }
                    }
                })
            });
        } else {
            context.res = { status: 400, body: { message: '不支持的请求方法' } };
            return;
        }

        // 3. 转发 GitHub 响应给前端
        const data = await response.json();
        context.res = {
            status: response.status,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' // 允许跨域
            },
            body: data
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: { message: '代理请求失败', error: error.message }
        };
    }
};