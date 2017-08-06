<template>
    <div class="container">
        <div class="row">
            <div class="col-md-6 col-md-offset-3">
                <h2>Welcome to WebRTC Video Demo</h2><br/>
                <form class="form" action="" @submit.prevent="submit()">
                    <input class="form-control" type="text" v-model="room_name" placeholder="请输入房间名"><br/>
                    <button class="btn btn-primary btn-block" type="submit">创建房间</button>
                </form>
            </div>
        </div>
    </div>
</template>

<script>
  export default {
    data() {
      return {
        room_name: ''
      }
    },
    methods: {
      submit() {
        this.$router.push({name: 'room', params: {room: this.room_name}});
      }
    }
  }
</script>

<style>

</style>