// 这是Azure Static Web Apps的API函数，处理Gist的GET/PATCH请求
const fetch = require('node-fetch');

module.exports = async function (context, req) {
    try {
        // 1. 获取前端传参
        const { gistType, method, content } = req.body || {};
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Azure环境变量中的Token
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

        // 2. 校验必要参数
        if (!gistType || !GIST_IDS[gistType] || !['GET', 'PATCH'].includes(method)) {
            context.res = {
                status: 400,
                body: { success: false, message: '参数错误' }
            };
            return;
        }

        // 3. 构建Gist请求配置
        const gistId = GIST_IDS[gistType];
        const filename = GIST_FILENAMES[gistType];
        const headers = {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        // 4. 处理GET请求（获取Gist内容）
        if (method === 'GET') {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                throw new Error(`GitHub API错误: ${response.status}`);
            }

            const gist = await response.json();
            const fileContent = gist.files[filename]?.content || '{"success":true,"data":[]}';
            context.res = {
                status: 200,
                body: JSON.parse(fileContent)
            };
        }

        // 5. 处理PATCH请求（更新Gist内容）
        if (method === 'PATCH') {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    files: {
                        [filename]: {
                            content: JSON.stringify({ success: true, data: content || [] }, null, 2)
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`GitHub API错误: ${response.status}`);
            }

            context.res = {
                status: 200,
                body: { success: true }
            };
        }
    } catch (error) {
        context.res = {
            status: 500,
            body: { success: false, message: error.message }
        };
    }
};