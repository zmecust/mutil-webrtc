<template>
    <div>
        <div class="container text-center" v-show="show">
            <div class="row">
                <div class="col-md-4 col-md-offset-4">
                    <form class="form" action="" @submit.prevent="submit()">
                        <h2>WebRTC Video Demo. Please Sign In</h2><br/>
                        <input class="form-control" type="text" placeholder="请先创建您的昵称"
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
                        <li class="list-group-item">您的昵称: {{user_name}}</li>
                        <li class="list-group-item">当前房间号: {{roomID}}</li>
                        <li class="list-group-item">当前在线人数: {{users.length}}</li>
                        <li class="list-group-item">在线用户:
                            <div v-for="user in users" :key="user">
                                <p>{{user}}</p>
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="col-md-9">
                    <div id="localVideo">
                        <video :src="local_video" autoplay></video>
                    </div>
                    <div id="remoteVideo"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
const socket = io.connect("http://127.0.0.1:3001");
var stream;
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
      user_name: "", //当前用户名
      show: true,
      roomID: this.$route.params.room, //房间号
      users: "", //当前房间的所有用户
      local_video: "" //本地摄像头地址
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
            this.handleAnswer(data);
            break;
          case "leave":
            this.handleLeave(data);
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
        //如果新加入的用户为自己时
        if (newUser == this.user_name) {
          this.initCreate();
        } else {
          //新加入用户非自己时
          var pc = this.createPeerConnection(newUser);
          pc.addStream(stream);
        }
      }
    },
    initCreate() {
      var self = this;
      navigator.getUserMedia({ video: true, audio: true }, gotStream, logError);
      function gotStream(e) {
        //displaying local video stream on the page
        stream = e;
        console.log(stream);
        self.local_video = window.URL.createObjectURL(e);
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
    //创建非自己的peerConnections，如C连接进去，创建A和B
    createPeerConnections() {
      for (var i = 0; i < this.users.length; i++) {
        if (this.users[i] !== this.user_name) {
          this.createPeerConnection(this.users[i]);
        }
      }
    },
    createPeerConnection(name) {
      var pc = (peerConn[name] = new RTCPeerConnection(configuration));
      pc.onicecandidate = event => {
        setTimeout(() => {
          if (event.candidate) {
            this.send({
              event: "candidate",
              candidate: event.candidate,
              name: name
            });
          }
        });
      };
      pc.onaddstream = function(e) {
        let child = document.createElement("video");
        child.src = window.URL.createObjectURL(e.stream);
        child.id = "remote_video" + name;
        document.getElementById("remoteVideo").appendChild(child);
      };
      return pc;
    },
    addStreams() {
      for (let connection in peerConn) {
        peerConn[connection].addStream(stream);
      }
    },
    sendOffers() {
      for (var i = 0, len = this.users.length; i < len; i++) {
        if (this.users[i] !== this.user_name) {
          this.sendOffer(this.users[i]);
        }
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
    handleLeave(data) {
      alert("用户" + data.name + "已退出");
      this.users = data.users;
      //移除退出用户的视频源
      var video = document.getElementById("remote_video" + data.name);
      video.parentNode.removeChild(video);
      var pc = peerConn[data.name];
      pc.close();
      pc.onicecandidate = null;
      pc.onaddstream = null;
    }
  }
};
</script>

<style>
#localVideo,
#remoteVideo {
  display: flex;
  align-items: flex-start;
}

#remoteVideo video {
  width: 25%;
  padding: 10px 10px 0 0;
}
</style>