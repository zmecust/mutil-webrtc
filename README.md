# mutil-webrtc

> 基于 WebRTC 的多人视频通话，解决视频卡顿和回音

## 演示地址

- [https://mutilwebrtc.laravue.org](https://mutilwebrtc.laravue.org)

## 项目概述

- 实现基于房间的多人（大于2人）webrtc 视频通话，在每两个对等端之间都建立一个连接，组成“全网状拓扑结构”
- 配套博文：[https://laravue.org/#/articles/27](https://laravue.org/#/articles/27)

## 部署要求

- 安装 redis (需要用到 redis 发布订阅)
- 安装 node > 6.0.0

## 安装

- git clone https://github.com/zmecust/mutil-webrtc.git
- npm i
- npm run build
- node server.js

## 本地部署

- 安装完之后，打开浏览器运行 `localhost:3001`

## 线上部署

- **Nginx 反向代理**

线上环境修改 `Room.vue` 和 `Welcome.vue` 中的 `const socket = io.connect('https://yourdomain');`

如果部署到线上环境，可以配置 Nginx 反向代理，并且配置 SSL 证书（WebRTC 必须要使用安全协议，如：https & wss）
如下所示：

```
server {
        listen 443 ssl;

        ssl_certificate '你的 SSL 证书地址';
        ssl_certificate_key '你的 SSL 证书地址';
        
        ssl_session_cache shared:SSL:50m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        server_name '你的域名';

        # 反向代理到 node 服务
        location / {
                proxy_pass    http://127.0.0.1:3001;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header Host $host;
        }
}
```

- **Supervisor 守护进程 (或者 pm2)**

node 服务由 Supervisor 启动并维护，设置参数如下：

```
[program:MutilWebRTC]
process_name=%(program_name)s
command=node /var/www/html/mutil-webrtc/server.js  # node 服务所在地址
autostart=true
autorestart=true
user=root
numprocs=1
redirect_stderr=false
stdout_logfile=/var/log/supervisor/MutilWebRTC.log
```
如果启动失败，可能需要执行：`unlink /run/supervisor.sock`

对应的需要修改 server.js 的 `app.use(express.static('/var/www/html/mutil-webrtc/dist'));` //客户端所在地址，修改成绝对路径，否则会报 404 错误

- supervisord -c /etc/supervisor/supervisord.conf //起服务，注意 supervisor 配置文件所在目录
- supervisord shutdown //关闭服务 
- supervisord reload //重启服务 

## 说明

- 线上环境部署需要配置 stun 服务，否则不同域之间不能直接通信；
- 如有任何疑问或者 bug，欢迎联系 `root@laravue.org` 或 `247281377@qq.com`
