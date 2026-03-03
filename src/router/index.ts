// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router';

// 导入页面组件
import HomeView from '../views/HomeView.vue';
import DiscoverView from '../views/DiscoverView.vue';
import FollowView from '../views/FollowView.vue';
import ProfileView from '../views/ProfileView.vue';
import MessageView from '../views/MessageView.vue';
import SearchView from '../views/SearchView.vue';
import LiveStreamView from '../views/LiveStreamView.vue';
import LiveStreamPlayer from '../views/LiveStreamPlayer.vue';
import StartLiveView from '../views/StartLiveView.vue';
import AdaptiveStreamDemo from '../views/AdaptiveStreamDemo.vue';
import VoiceChatDemo from '../views/VoiceChatDemo.vue';
import DanmakuDemo from '../views/DanmakuDemo.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: '首页' }
    },
    {
      path: '/discover',
      name: 'discover',
      component: DiscoverView,
      meta: { title: '发现' }
    },
    {
      path: '/follow',
      name: 'follow',
      component: FollowView,
      meta: { title: '关注' }
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { title: '个人中心' }
    },
    {
      path: '/profile/:id',
      name: 'profile-detail',
      component: ProfileView,
      meta: { title: '用户主页' }
    },
    {
      path: '/message',
      name: 'message',
      component: MessageView,
      meta: { title: '消息' }
    },
    {
      path: '/search',
      name: 'search',
      component: SearchView,
      meta: { title: '搜索' }
    },
    {
      path: '/view',
      name: 'live-view',
      component: LiveStreamView,
      meta: { title: '直播间' }
    },
    {
      path: '/player',
      name: 'player',
      component: LiveStreamPlayer,
      meta: { title: '播放器' }
    },
    {
      path: '/start-live',
      name: 'start-live',
      component: StartLiveView,
      meta: { title: '开始直播' }
    },
    {
      path: '/adaptive-stream',
      name: 'adaptive-stream',
      component: AdaptiveStreamDemo,
      meta: { title: '自适应拉流' }
    },
    {
      path: '/voice-chat',
      name: 'voice-chat',
      component: VoiceChatDemo,
      meta: { title: 'WebRTC 语音连麦' }
    },
    {
      path: '/danmaku',
      name: 'danmaku',
      component: DanmakuDemo,
      meta: { title: '高性能弹幕系统' }
    },
    // 其他功能路由（暂时重定向到首页）
    {
      path: '/settings',
      name: 'settings',
      redirect: '/',
      meta: { title: '设置' }
    },
    {
      path: '/my-videos',
      name: 'my-videos',
      redirect: '/profile',
      meta: { title: '我的作品' }
    },
    {
      path: '/wallet',
      name: 'wallet',
      redirect: '/',
      meta: { title: '钱包' }
    },
    {
      path: '/data-center',
      name: 'data-center',
      redirect: '/',
      meta: { title: '数据中心' }
    },
    {
      path: '/test',
      name: 'test',
      component: () => import('../views/Test.vue'),
      meta: { title: '测试页面' }
    },
    {
      path: '/flvTest',
      name: 'flvTest',
      component: () => import('../views/FlVPlayer.vue'),
      meta: { title: 'FLV 测试' }
    },
    // 404 页面
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
});

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - CyberLive` : 'CyberLive';
  next();
});

export default router;