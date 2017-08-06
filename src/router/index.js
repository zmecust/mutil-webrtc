import Vue from 'vue'
import Router from 'vue-router'
import Welcome from '../views/Welcome'
import Room from '../views/Room'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: Welcome
    },
    {
      path: '/room/:room',
      name: 'room',
      component: Room
    }
  ]
})