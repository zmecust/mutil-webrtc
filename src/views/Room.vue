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
                            <div v-for="user in users" :key="user">
                                <p>{{user}}</p>
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="col-md-9">
                    <video id="localVideo" :src="local_video" autoplay></video>
                    <div id="remoteVideo"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
const socket = io.connect("http://localhost:3000");
var streams = [];
var peerConn = [];
var connectedUser;
var configuration = {
  iceServers: [
    {
      url: "turn:115.28.170.217:3478",
      credential: "zmecust",
      username: "zmecust"
    }
  ]
};

export default {
  data() {
    return {
      user_name: "",
      show: true,
      roomID: this.$route.params.room,
      users: "",
      local_video: "",
      answer: false
    };
  },
  mounted() {
    socket.on(
      "message",
      function(data) {
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
      }.bind(this)
    );
  },
  methods: {
    submit() {
      if (this.user_name != "") {
        this.send({
          event: "join",
          name: this.user_name,
          room: this.roomID
        });
      }
    },
    send(message) {
      socket.send(JSON.stringify(message));
    },
    handleLogin(data) {
      if (data.success === false) {
        alert("Ooops...try a different username");
      } else {
        this.show = false;
        this.users = data.users;
        var newUser = this.users[this.users.length - 1];
        if (newUser == this.user_name) {
          this.initCreate();
        } else {
          var pc = this.createPeerConnection(newUser);
          for (var i = 0; i < streams.length; i++) {
            var stream = streams[i];
            pc.addStream(stream);
          }
        }
      }
    },
    initCreate() {
      var self = this;
      navigator.getUserMedia({ video: true, audio: true }, gotStream, logError);
      function gotStream(stream) {
        //displaying local video stream on the page
        streams.push(stream);
        self.local_video = window.URL.createObjectURL(stream);
        if (
          self.users.length != 1 &&
          self.users[self.users.length - 1] == self.user_name
        ) {
          self.call();
        }
      }
      function logError(error) {
        console.log(error);
      }
    },
    call() {
      this.createPeerConnections();
      this.addStreams();
      this.sendOffers();
    },
    createPeerConnections() {
      for (var i = 0; i < this.users.length; i++) {
        if (this.users[i] !== this.user_name) {
          this.createPeerConnection(this.users[i]);
        }
      }
    },
    createPeerConnection(id) {
      var pc = (peerConn[id] = new RTCPeerConnection(configuration));
      pc.onicecandidate = event => {
        console.log(event.target.iceGatheringState);
        if (event.candidate) {
          this.send({
            event: "candidate",
            candidate: event.candidate,
            name: id
          });
        }
      };
      pc.onaddstream = function(e) {
        let child = document.createElement("video");
        child.src = window.URL.createObjectURL(e.stream);
        document.getElementById("remoteVideo").appendChild(child);
      };
      return pc;
    },
    addStreams() {
      for (var i = 0; i < streams.length; i++) {
        var stream = streams[i];
        for (var connection in peerConn) {
          peerConn[connection].addStream(stream);
        }
      }
    },
    sendOffers() {
      for (var i = 0, len = this.users.length; i < len; i++) {
        var name = this.users[i];
        this.sendOffer(name);
      }
    },
    sendOffer(name) {
      var pc = peerConn[name];
      pc.createOffer(
        offer => {
          this.send({
            event: "offer",
            offer: offer,
            connectedUser: name
          });
          pc.setLocalDescription(offer);
        },
        error => {
          alert("Error when creating an offer");
        }
      );
    },
    handleOffer(data) {
      var pc = peerConn[data.name];
      pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      //create an answer to an offer
      pc.createAnswer(
        answer => {
          pc.setLocalDescription(answer);
          this.send({
            event: "answer",
            answer: answer,
            connectedUser: data.name
          });
        },
        error => {
          alert("Error when creating an answer");
        }
      );
    },
    handleMsg(data) {
      console.log(data.message);
    },
    handleAnswer(data) {
      peerConn[data.name].setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
    },
    handleCandidate(data) {
      peerConn[data.name].addIceCandidate(new RTCIceCandidate(data.candidate));
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
      //this.remote_video = "";
      peerConn[this.user_name].close();
      peerConn[this.user_name].onicecandidate = null;
      peerConn[this.user_name].onaddstream = null;
      if (peerConn[this.user_name].signalingState == "closed") {
        this.initCreate();
      }
    }
  }
};
</script>

<style>

</style>