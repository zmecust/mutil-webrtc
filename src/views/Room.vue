<template>
  <div>
    <div class="container text-center" v-show="show">
      <div class="row">
        <div class="col-md-4 col-md-offset-4">
          <form class="form" action @submit.prevent="submit()">
            <h2>WebRTC Video Demo. Please Sign In</h2>
            <br />
            <input
              class="form-control"
              type="text"
              placeholder="请先创建您的昵称"
              required
              autofocus
              v-model="user_name"
            />
            <br />
            <button class="btn btn-primary btn-block" type="submit">创建昵称</button>
          </form>
        </div>
      </div>
    </div>
    <div class="container text-center" v-show="! show">
      <div class="row">
        <div class="col-md-3" style="height: 50%">
          <ul class="list-group">
            <li class="list-group-item">您的昵称: {{ user_name }}</li>
            <li class="list-group-item">当前房间号: {{ roomID }}</li>
            <li class="list-group-item">当前在线人数: {{ users.length }}</li>
            <li class="list-group-item">
              在线用户:
              <div v-for="user in users" :key="user">
                <p>{{ user }}</p>
              </div>
            </li>
          </ul>
        </div>
        <div class="col-md-9">
          <div id="local">
            <video id="localVideo" autoplay></video>
          </div>
          <div id="remoteVideo"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as config from '../../configure';

const socket = io.connect(config.API_ROOT);
const configuration = {
  iceServers: [config.DEFAULT_ICE_SERVER],
};

let localStream, connectedUser;
const peerConn = [];

export default {
  data() {
    return {
      user_name: '', //当前用户名
      show: true,
      roomID: this.$route.params.room, //房间号
      users: '', //当前房间的所有用户
    };
  },
  mounted() {
    socket.on(
      'message',
      function(data) {
        console.log(data);
        switch (data.event) {
          case 'join':
            this.handleLogin(data);
            break;
          case 'offer':
            this.handleOffer(data);
            break;
          case 'candidate':
            this.handleCandidate(data);
            break;
          case 'msg':
            this.handleMsg(data);
            break;
          case 'answer':
            this.handleAnswer(data);
            break;
          case 'leave':
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
      if (this.user_name !== '') {
        this.send({
          event: 'join',
          name: this.user_name,
          room: this.roomID,
        });
      }
    },
    send(message) {
      socket.send(JSON.stringify(message));
    },
    handleLogin(data) {
      if (data.success === false) {
        alert('Ooops...try a different username');
      } else {
        this.show = false;
        this.users = data.users;
        var newUser = this.users[this.users.length - 1];
        // If new user is youself
        if (newUser === this.user_name) {
          this.initCreate();
        } else {
          // New user is not youself
          var pc = this.createPeerConnection(newUser);
          pc.addStream(localStream);
        }
      }
    },
    addVideoURL(elementId, stream) {
      var video = document.getElementById(elementId);
      // Old brower may have no srcObject
      if ('srcObject' in video) {
        video.srcObject = stream;
      } else {
        // 防止在新的浏览器里使用它，应为它已经不再支持了
        video.src = window.URL.createObjectURL(stream);
      }
    },
    initCreate() {
      var self = this;
      // New webrtc API
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then(function(stream) {
          var video = document.getElementById('localVideo');
          self.addVideoURL('localVideo', stream);
          video.muted = true;
          localStream = stream;
          if (self.users.length !== 1 && self.users[self.users.length - 1] === self.user_name) {
            self.call();
          }
        })
        .catch(function(err) {
          console.log(err.name + ': ' + err.message);
        });
    },
    call() {
      this.createPeerConnections();
      this.addStreams();
      this.sendOffers();
    },
    // Create all peerConnections exclude self one. i.e. If connected usr is C, then create peerConnections for A and B.
    createPeerConnections() {
      for (var i = 0; i < this.users.length; i++) {
        if (this.users[i] !== this.user_name) {
          this.createPeerConnection(this.users[i]);
        }
      }
    },
    createPeerConnection(name) {
      var self = this;
      var pc = (peerConn[name] = new RTCPeerConnection(configuration));
      pc.onicecandidate = event => {
        setTimeout(() => {
          if (event.candidate) {
            this.send({
              event: 'candidate',
              candidate: event.candidate,
              name: name,
            });
          }
        });
      };
      pc.onaddstream = function(e) {
        const child = document.createElement('video');
        child.id = `remote_video_${name}`;
        child.autoplay = 'autoplay';
        child.srcObject = e.stream;
        document.getElementById('remoteVideo').appendChild(child);
      };
      return pc;
    },
    addStreams() {
      for (let connection in peerConn) {
        peerConn[connection].addStream(localStream);
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
            event: 'offer',
            offer: offer,
            connectedUser: name,
          });
          pc.setLocalDescription(offer);
        },
        error => {
          alert('Error when creating an offer');
        }
      );
    },
    handleOffer(data) {
      var pc = peerConn[data.name];
      pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      // Create an answer to an offer
      pc.createAnswer(
        answer => {
          pc.setLocalDescription(answer);
          this.send({
            event: 'answer',
            answer: answer,
            connectedUser: data.name,
          });
        },
        error => {
          alert('Error when creating an answer');
        }
      );
    },
    handleMsg(data) {
      console.log(data.message);
    },
    handleAnswer(data) {
      peerConn[data.name].setRemoteDescription(new RTCSessionDescription(data.answer));
    },
    handleCandidate(data) {
      peerConn[data.name].addIceCandidate(new RTCIceCandidate(data.candidate));
    },
    handleLeave(data) {
      alert('用户' + data.name + '已退出');
      this.users = data.users;
      // Remove video src for the exist user
      var video = document.getElementById(`remote_video_${data.name}`);
      video.parentNode.removeChild(video);
      var pc = peerConn[data.name];
      pc.close();
      pc.onicecandidate = null;
      pc.onaddstream = null;
    },
  },
};
</script>

<style>
#local,
#remoteVideo {
  display: flex;
  align-items: flex-start;
}

#remoteVideo video {
  width: 25%;
  padding: 10px 10px 0 0;
}
</style>