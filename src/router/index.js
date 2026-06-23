import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Board from '../views/Board.vue'
import Thread from '../views/Thread.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/:board/', component: Board },
  { path: '/:board/thread/:id', component: Thread },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
