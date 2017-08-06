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
                        <li class="list-group-item">
                            <button class="btn-success btn" v-show="accept_video" @click="accept">您有视频邀请，接受?</button>
                        </li>
                    </ul>
                </div>
                <div class="col-md-9">
                    <video id="localVideo" :src="local_video" autoplay></video>
                    <video id="remoteVideo" :src="remote_video" autoplay></video>
                    <div class="row text-center">
                        <div class="col-md-12">
                            <input class="form-control" type="text" v-model="call_username" placeholder="username to call"/>
                            <button class="btn-success btn" @click="call">Call</button>
                            <button class="btn-danger btn" @click="hangUp">Hang Up</button>
                        </div>
                    </div>
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
  var acceptData;

  export default {
    data() {
      return {
        user_name: '',
        show: true,
        roomID: this.$route.params.room,
        users: '',
        call_username: '',
        local_video: '',
        remote_video: '',
        accept_video: false
      }
    },
    mounted() {
      socket.on('message', function (data) {
        switch (data.event) {
          case "join":
            this.handleLogin(data);
            break;
          case "offer":
            acceptData = data;
            this.handleOffer();
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
        let self = this;
        if (data.success === false) {
          alert("Ooops...try a different username");
        } else {
          this.show = false;
          this.users = data.users;

          /*----------Starting a peer connection----------*/
          //getting local video stream
          navigator.webkitGetUserMedia({ video: true, audio: true }, function (myStream) {
            stream = myStream;
            //displaying local video stream on the page
            self.local_video = window.URL.createObjectURL(stream);
            //using Google public stun server
            var configuration = {
              "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
            };
            peerConn = new webkitRTCPeerConnection(configuration);
            // setup stream listening
            peerConn.addStream(stream);
            //when a remote user adds stream to the peer connection, we display it
            peerConn.onaddstream = function (e) {
             self.remote_video = window.URL.createObjectURL(e.stream);
            };
            // Setup ice handling
            peerConn.onicecandidate = function (event) {
              if (event.candidate) {
                self.send({
                  event: "candidate",
                  candidate: event.candidate
                });
              }
            };
          }, function (error) {
            console.log(error);
          });
        }
      },
      call() {
        var self = this;
        if (this.call_username.length > 0) {
          connectedUser = this.call_username;
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
        }
      },
      handleOffer() {
        this.accept_video = true;
      },
      accept() {
        var self = this;
        var data = acceptData;
        connectedUser = data.name;
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
        this.accept_video = false;
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
        connectedUser = null;
        this.remote_video = null;
        peerConn.close();
        peerConn.onicecandidate = null;
        peerConn.onaddstream = null;
      }
    }
  }
</script>

<style>

</style>