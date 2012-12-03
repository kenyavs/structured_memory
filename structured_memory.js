$(function() {
  JSONPCollection = Backbone.Collection.extend({
    model: Backbone.Model.extend({}),
    initialize: function(options){
      this.username = options.username;

    },
    url: function() { 
      var username = this.username;
      return 'https://api.twitter.com/1/statuses/user_timeline.json?screen_name='+username+'&count=20';
    },

    // override backbone synch to force a jsonp call
    sync: function(method, model, options){  
      options.timeout = 10000;  
      options.dataType = "jsonp";  
      return Backbone.sync(method, model, options); 
    },

    parse: function(response){
      return response;
    },
  });

  Card = Backbone.View.extend({
    events:{
      "click": "flipOn"
    },
    initialize: function(options){
      this.options.board.bind('flipOff', this.flipOff, this);
      this.options.board.bind("removeCard", this.removeCard, this);
    },
    flipOn: function(){
      this.$el.removeClass("off");
      this.$el.addClass("on");
      this.options.board.incrementClicks();
      this.options.board.recordClick(this);
      this.undelegateEvents();
    },
    //this handler is currently called for every view instance created. how can i only have it be called once?
    flipOff: function(){
      var selectedCards = this.options.board.get("selectedCards");

      for(var i = 0; i<selectedCards.length; i++){
        //gray out cell and disable click
        $(selectedCards[i].el).removeClass("on");
        $(selectedCards[i].el).addClass("off");
      } 
    },
    removeCard: function(){
      var selectedCards = this.options.board.get("selectedCards");
      
      for(var i = 0; i<selectedCards.length; i++){
        //gray out cell and disable click/remove click event listener 
        $(selectedCards[i].el).removeClass("on");
        $(selectedCards[i].el).addClass("removed");
      }
    },
    render: function(){
      //var data = this.options.board.attributes.tweets;
      //var cardNum = this.options.cardNum;
      //this.text = data[cardNum]["text"];
      var boardCards = this.options.board.attributes.cards;

      this.$el.html(this.options.text);
      this.$el.addClass('div-cell off');
      return this;
    }
  });

  Board = Backbone.Model.extend({  
    initialize: function(){
      this.set({"selectedCards":[], "numberOfMatches":0, "clickNum":0, "cards":[]});
    },
    incrementClicks: function(){
      this.set("clickNum", this.get("clickNum")+1);
    },
    recordClick: function(card){
      this.get("selectedCards").push(card);
    },
    resetClicks: function(){
      this.trigger("flipOff");//      this.trigger("flipOff", selectedCards);
      this.set("clickNum", 0);
      this.set("selectedCards", []);
    },
    checkGameStatus: function(){
      if(this.get("clickNum")===2){
        this.compareClicks();
        var self = this;

        function innerFunction(){
          self.resetClicks();

          if(self.get("numberOfMatches")===self.get("uniqueCards")){
            self.trigger("askToPlayAgain"); 
          }
        }

        setTimeout(function(){innerFunction()}, 500);
      }
    },
    compareClicks: function(){
      if(this.get("selectedCards")[0].options.matchId===this.get("selectedCards")[1].options.matchId){
        console.log("It's a match!");
        var self = this;
          
        function innerFunction(self){
          self.trigger("removeCard");
        }
        setTimeout(function(){innerFunction(self)}, 500);
        this.set("numberOfMatches", this.get("numberOfMatches")+1);
      }
      else{
        var length = this.get("selectedCards").length;
        for(var i = 0; i<length; i++){
          this.get("selectedCards")[i].delegateEvents({"click": "flipOn"});
        }
        console.log("Welp :/");
      }
    }
  });


  UsernameView = Backbone.View.extend({
    el: $("#username"),
    events: {
      "click #username .button":"validateUsername"
    },
    validateUsername: function(){
      var username = $(".username-input").val();

      if(!username){
        var error = new Error("Must enter username to play.");
      }
      else{
        $("#message-drawer").addClass("hide");
        var tweets = this.requestTweets(username);
      }
    },
    requestTweets: function(username){
      var jsonp = new JSONPCollection({username:username});
      this.model = jsonp;

      this.model.bind("reset", this.dupeTweets, this);
      this.model.fetch();
    },
    shuffle: function(list){
      var i, j, temp;
      for (i = list.length - 1; i > 0; i--) {
        j = Math.floor(Math.random()*i);
        temp = list[i];
        list[i] = list[j];
        list[j] = temp;
      }
      return list;
    },
    dupeTweets: function(){
      var row = 4;
      var col = 3;
      var UNIQUE_CARDS = (row*col)/2;
      var tweets = [];
      var txt = '';
      var i = 0;
      var self = this;

      this.model.each(function(tweet){
        txt = tweet.toJSON().text;//TODO: change to get("text")
        var obj = {text:txt, matchId:i}; //change i. i should be able to get somehting for the each loop(index or something)
        tweets.push(obj);
        i++;
      });

      if(tweets.length<UNIQUE_CARDS){
        var error = new Error("Bummer, not enough tweets to play. Choose another username");
      }

      tweets = this.shuffle(tweets);
      tweets = tweets.slice(0,UNIQUE_CARDS);
      
      tweets = this.shuffle(tweets.concat(tweets));
      this.tweets = tweets;

      this.board = new Board({tweets:tweets, row:row, col:col, uniqueCards:UNIQUE_CARDS});
      this.gameView = new GameView({board: this.board});  
      self.gameView.loadTweets();
      self.gameView.hideUsernameBox();
    }
  });

  GameView = Backbone.View.extend({
    el: $("#container"),
    initialize: function(){
      this.options.board.bind('askToPlayAgain', this.askToPlayAgain, this);
    },
    events:{
      "click #board": "checkGameStatus",
      "click #play-again .button": "reloadWindow"
    },
    loadTweets: function(){
      var COL = this.options.board.attributes.col;
      var ROW = this.options.board.attributes.row;
      var cardNum = 0;    
      var tweets = this.options.board.attributes.tweets;

      for(var i = 0; i<ROW; i++){
        this.createRow();
        
        var row = this.getRowElement();
        
        for(var j = 0; j<COL; j++){
          var matchId = tweets[cardNum]["matchId"];
          var text = tweets[cardNum]["text"];

          var newCard = new Card({cardNum:cardNum, matchId:matchId, text:text, row:row, board:this.options.board});
          this.options.board.attributes.cards.push(newCard);
          row.append(newCard.render().el);
          cardNum++;
        }
      }
    },
    createRow: function(){
      var row = "<div class='div-row'>";
      $("#board").append(row);
    },
    getRowElement: function(){
      return $(".div-row").last();
    },
    checkGameStatus: function(){
      this.options.board.checkGameStatus();
    },
    askToPlayAgain:function(){
      $("#username").addClass("z-index");
      $("#play-again").removeClass("hide");    
    },
    hideUsernameBox: function(){
      $("#username").addClass("hide");
    },
    reloadWindow: function(){
      window.location.reload();
    }
  });

var Error = function(msg){
  $(".message-text").html(msg);
  $("#message-drawer").removeClass("hide");
}
  
  var usernameView  = new UsernameView;
});
