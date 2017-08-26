<template>
    <div>
        <div class="container text-center" v-show="show">
            <div class="row">
                <div class="col-md-4 col-md-offset-4">
                    <form class="form" action="" @submit.prevent="submit()">
                        <h2>WebRTC Video Demo. Please Sign In</h2><br/>
                        <input class="form-control" type="text" placeholder="请输入您的昵称"
                               required="" autofocus="" v-model="user_name"><br/>
                        <button class="btn btn-primary btn-block" type="submit">创建昵称</button>
                    </form>
                </div>
            </div>
        </div>
        <div class="container text-center" v-show="! show">
            <div class="row">
                <div class="col-md-3" style="height: 50%">
                    <ul class="list-group">
                        <li class="list-group-item">昵称: {{user_name}}</li>
                        <li class="list-group-item">房间: {{roomID}}</li>
                        <li class="list-group-item">当前在线人数: {{users.length}}</li>
                        <li class="list-group-item">在线用户:
                            <div v-for="user in users">
                                <p>{{user}}</p>
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="col-md-9">
                    <video id="localVideo" :src="local_video" autoplay></video>
                    <video id="remoteVideo" :src="remote_video" autoplay></video>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
  const socket = io.connect('http://localhost:3000');
  var stream;
  var peerConn;
  var connectedUser;
  var configuration = {
    "iceServers": [
      { "url": "turn:115.28.170.217:3478", "credential": "zmecust", "username": "zmecust" }
    ]
  };

  export default {
    data() {
      return {
        user_name: '',
        show: true,
        roomID: this.$route.params.room,
        users: '',
        local_video: '',
        remote_video: '',
        answer: false
      }
    },
    mounted() {
      socket.on('message', function (data) {
        console.log(data);
        switch (data.event) {
          case "join":
            this.handleLogin(data);
            break;
          case "offer":
            this.handleOffer(data);
            break;
          case "candidate":
            this.handleCandidate(data);
            break;
          case "msg":
            this.handleMsg(data);
            break;
          case "answer":
            this.answer = true;
            this.handleAnswer(data);
            break;
          case "leave":
            this.answer = true;
            this.handleLeave();
            break;
          default:
            break;
        }
      }.bind(this));
    },
    methods: {
      submit() {
        if (this.user_name != '') {
          this.send({
            event: "join",
            name: this.user_name,
            room: this.roomID
          });
        }
      },
      send(message) {
        if (connectedUser) {
          message.connectedUser = connectedUser;
        }
        socket.send(JSON.stringify(message));
      },
      handleLogin(data) {
        if (data.success === false) {
          alert("Ooops...try a different username");
        } else {
          this.show = false;
          this.users = data.users;
          this.initCreate();
        }
      },
      initCreate() {
        let self = this;
        peerConn = new RTCPeerConnection(configuration);
        navigator.getUserMedia({ video: true, audio: true }, gotStream, logError);
        function gotStream(stream) {
          //displaying local video stream on the page
          self.local_video = window.URL.createObjectURL(stream);
          peerConn.addStream(stream);
          if ((self.users.length == 2) && (self.users[1] == self.user_name)) {
            self.call();
          }
        }
        function logError(error) {
          console.log(error);
        }
        peerConn.onaddstream = function (e) {
          self.remote_video = window.URL.createObjectURL(e.stream);
        };
        peerConn.onicecandidate = function (event) {
          console.log(event.target.iceGatheringState);
          if (event.candidate) {
            self.send({
              event: "candidate",
              candidate: event.candidate
            });
          }
        };
      },
      call() {
        var self = this;
        connectedUser = this.users[0];
        // create an offer
        peerConn.createOffer(function (offer) {
          self.send({
            event: "offer",
            offer: offer
          });
          peerConn.setLocalDescription(offer);
        }, function (error) {
          alert("Error when creating an offer");
        });
      },
      handleOffer(data) {
        var self = this;
        connectedUser = data.name;
        console.log(connectedUser);
        peerConn.setRemoteDescription(new RTCSessionDescription(data.offer));
        //create an answer to an offer
        peerConn.createAnswer(function (answer) {
          peerConn.setLocalDescription(answer);
          self.send({
            event: "answer",
            answer: answer
          });
        }, function (error) {
          alert("Error when creating an answer");
        });
      },
      handleMsg(data) {
        console.log(data.message);
      },
      handleAnswer(data) {
        peerConn.setRemoteDescription(new RTCSessionDescription(data.answer));
      },
      handleCandidate(data) {
        peerConn.addIceCandidate(new RTCIceCandidate(data.candidate));
      },
      hangUp() {
        this.send({
          event: "leave"
        });
        this.handleLeave();
      },
      handleLeave() {
        alert("通话已结束");
        connectedUser = null;
        this.remote_video = "";
        peerConn.close();
        peerConn.onicecandidate = null;
        peerConn.onaddstream = null;
        if (peerConn.signalingState == 'closed') {
          this.initCreate();
        }
      },
    }
  }
</script>

<style>

</style>