var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var moment = require('moment');
var favicon = require('serve-favicon');
var newrelic = require ('newrelic');
var jsforce = require('jsforce');
var decodeUriComponent = require('decode-uri-component');
var lowerCase = require('lower-case');
var session = require('express-session');


// アンケート回答のコンポーネントファイルパスObject
var answerCompPathObj = {
  "選択リスト": "../partials/selectListComp.ejs",
  "チェックボックス": "../partials/checkboxComp.ejs",
  "ラジオボタン": "../partials/radioButtonComp.ejs",
  "テキスト": "../partials/textboxComp.ejs",
  "テキストエリア": "../partials/textAreaComp.ejs"
};

var respondentName = '';


app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/favicon16.ico'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use( bodyParser.json() );
app.use( bodyParser.urlencoded() );

app.use(session({ secret: 'yabumi_dev_app', cookie: { maxAge: 600000 }}));

//パラメータなしの場合（不正な呼び出しまたはNewRelicPinger）
app.get('/', function(request, response) {

  //NewRelicPinger以外でパラメータなしの場合、不正な呼び出し
  if (request.headers["user-agent"].length === request.headers["user-agent"].replace("NewRelicPinger","").length){
    console.log('不正な呼び出し！ '+request.headers["user-agent"]);
  }

  var initResult = new Array();
  var respondentInfo = {
    "name": "",
    "seibetsu": "",
    "nendai": ""
  };
  request.session.respondentName = "";

  alertType  = 'alert-danger';
  msg = "Error:アンケート情報を取得できませんでした。";
  response.render('pages/error', {alertType: alertType, message: msg, respondentInfo: respondentInfo} );
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

var pg = require('pg');
// プレビュー画面の処理
app.get('/preview', function (request, response) {
  var serverUrl = decodeURIComponent(request.query.serverUrl);
  var qId = request.query.qId;
  console.log('serverUrl:' + serverUrl);
  console.log('qId:' + qId);
  var conn = new jsforce.Connection({
    loginUrl : serverUrl
  });
  var username = process.env.SF_USERID;
  var password = process.env.SF_PASSWORD;
  var respondentInfo = {
    "name": "",
    "seibetsu": "",
    "nendai": ""
  };
  conn.login(username, password, function(err, userInfo) {
    if (err) {
      alertType  = 'alert-danger';
      msg = "Error:アンケート情報を取得できませんでした。";
      response.render('pages/error', {alertType: alertType, message: msg, respondentInfo: respondentInfo} );
      return console.error(err);
    }
    var queryStr = "SELECT id, name, questionnairetitle__c, no__c, type__c, answer__c FROM QuestionnaireQuestion__c WHERE Questionnaire__c = \'" + qId + "\' ORDER BY Questionnaire__c ASC, No__c ASC ";
    conn.query(queryStr, function(err, result) {
      if (err) {
        alertType  = 'alert-danger';
        msg = "Error:アンケート情報を取得できませんでした。";
        response.render('pages/error', {alertType: alertType, message: msg, respondentInfo: respondentInfo} );
        console.log("errorです : ");
        return console.error(err);
      }
      if (result.done) {
        if(result.records.length > 0){
          var parentTitle = '';
          if(result.records.length > 0){
            parentTitle = result.records[0].QuestionnaireTitle__c;
          }
          respondentInfo["name"] = 'プレビュー';
          respondentInfo["seibetsu"] = '';
          respondentInfo["nendai"] = '';

          var ansMap = new Object();
          // Postgres側の項目名に合わせる(KeyをLowerCaseにする)
          var recList = new Array();
          for(var i = 0; i < result.records.length; i++){
            var rec = new Object();
            Object.keys(result.records[i]).forEach(function(key) {
              if (key != "attributes"){
                rec[lowerCase(key)] = this[key];
                console.log("key:" + lowerCase(key));
                console.log("value:" + this[key]);
              }
            }, result.records[i]);
            rec["sfid"] = result.records[i].Id;
            ansMap[result.records[i].Id] = new Array();
            recList.push(rec);
          }
          console.log(recList[0].type__c);
          console.log(JSON.stringify(recList));
          response.render('pages/qa', {results: recList, ansMap: ansMap, title: parentTitle, answerCompPathObj: answerCompPathObj, resSfid: "", respondentInfo: respondentInfo, previewFlg: true, answeredFlg: false} );
        }
        else{
          alertType  = 'alert-danger';
          msg = "Error:アンケート情報を取得できませんでした。";
          response.render('pages/error', {alertType: alertType, message: msg, respondentInfo: respondentInfo} );
        }
      }
      else{
        alertType  = 'alert-danger';
        msg = "Error:アンケート情報を取得できませんでした。";
        response.render('pages/error', {alertType: alertType, message: msg, respondentInfo: respondentInfo} );
      }
    });
  });
  
});

// アンケート画面の処理
app.get('/qa', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    var sfid = '';
    var resSfid = request.query.resSfid;
    var selectStr = 'SELECT * FROM salesforce.questionnairequestion__c ';
    var whereStr = '';
    console.log("resSfid:" + resSfid);
    
    var alertType = '';
    var msg = '';
    
    var respondentInfo = {
      "name": "",
      "seibetsu": "",
      "nendai": ""
    };

    // 回答者情報を取得
    var resSfidDecrypt = '';
    if(!(typeof resSfid === "undefined") && resSfid != ''){
      resSfidDecrypt = decrypt(resSfid);
      console.log('resSfid:' + resSfidDecrypt);
    }
    var selectRespondent = 'SELECT * FROM salesforce.questionnairerespondent__c WHERE sfid = \'' + resSfidDecrypt + '\'';
    client.query(selectRespondent, function(err, respondentResult) {
      done();
      if (err){
        console.error(err);
        alertType  = 'alert-danger';
        msg = "Error " + err;
        response.render('pages/error', {alertType: alertType, message: msg, respondentInfo: respondentInfo} );
//        response.send("Error " + err);
      }
      else{
        // 回答者情報を取得できた場合
        if(respondentResult.rows.length > 0){
          if(!(typeof request.query.sfid === "undefined") && request.query.sfid != ''){
            console.log('request.query.sfid:' + request.query.sfid);
            sfid = decrypt(request.query.sfid);
            console.log('sfid:' + sfid);
            whereStr = ' WHERE questionnaire__c LIKE \'' + sfid + '%\'';
            // 回答者の名前を取得
            respondentName = '';
            if(!(typeof respondentResult.rows[0].sei__c === "undefined") && respondentResult.rows[0].sei__c != ''){
              respondentName = respondentResult.rows[0].sei__c;
            }
            if(!(typeof respondentResult.rows[0].mei__c === "undefined") && respondentResult.rows[0].mei__c != ''){
              if(respondentName != ''){
                respondentName += ' ';
              }
              respondentName += respondentResult.rows[0].mei__c;
            }

            // セッションに回答者名を格納
            request.session.respondentName = respondentName;
            respondentInfo["name"] = respondentName;
            respondentInfo["seibetsu"] = respondentResult.rows[0].seibetsu__c;
            respondentInfo["nendai"] = respondentResult.rows[0].nendai__c;
            console.log('respondentInfo:' + respondentInfo["name"]);
            console.log('respondentInfo:' + respondentInfo["seibetsu"]);
            console.log('respondentInfo:' + respondentInfo["nendai"]);
          }
          var queryStr = selectStr + whereStr + ' ORDER BY questionnaire__c ASC, no__c ASC ';
          client.query(queryStr, function(err, result) {
            done();
            if (err){
              console.error(err);
              alertType  = 'alert-danger';
              msg = "Error " + err;
              response.render('pages/error', {alertType: alertType, message: msg, respondentInfo: respondentInfo} );
//                response.send("Error " + err);
            }
            else{
              var parentTitle = '';
              if(result.rows.length > 0){
                parentTitle = result.rows[0].questionnairetitle__c;
              }
              // 設問回答マップを作成
              var ansMap = new Object();
              result.rows.forEach(function(question){
                // 回答マップにKey(設問ID)が存在しない場合、new Array()する
                if(!(question.sfid in ansMap)){
                  ansMap[question.sfid] = new Array();
                }
              });

              console.log('answeredflg: ' + respondentResult.rows[0].answerdatetime__c);
              // 回答済みの場合、入力項目を非活性とし、回答内容を表示する
              if(respondentResult.rows[0].answerdatetime__c){
                console.log('回答済み');
                // 回答内容を取得
//                var ansListQuery = "SELECT * FROM salesforce.answerdetails__c WHERE questionnairerespondent__c = \'" + resSfidDecrypt + "\'";
                var ansListQuery = "SELECT "
                                 +     "a.sfid a_sfid "
                                 +     ",a.name a_name "
                                 +     ",a.question__c a_question "
                                 +     ",a.answer__c a_answer "
                                 +     ",a.answertextarea__c a_answertextarea "
                                 +     ",q.sfid q_sfid "
                                 +     ",q.name q_name "
                                 +     ",q.type__c q_type "
                                 +     ",q.no__c q_no "
                                 + "FROM "
                                 +     "salesforce.answerdetails__c a "
                                 +     ",salesforce.questionnairequestion__c q "
                                 + "WHERE "
                                 +     "a.question__c = q.sfid "
                                 +   "AND "
                                 +     "a.questionnairerespondent__c = \'" + resSfidDecrypt + "\' "
                                 + "ORDER BY "
                                 +     "q.no__c asc ";

                client.query(ansListQuery, function(err, ansResult) {
                  done();
                  if (err){
                    console.error(err);
                    alertType  = 'alert-danger';
                    msg = "Error " + err;
                    response.render('pages/error', {alertType: alertType, message: msg, respondentInfo: respondentInfo} );
    //                response.send("Error " + err);
                  }
                  else{

                    ansResult.rows.forEach(function(ans){
                      // 回答マップにKey(設問ID)が存在しない場合、new Array()する
                      if(!(ans.a_question in ansMap)){
                        ansMap[ans.a_question] = new Array();
                      }
                      if(ans.q_type != "テキストエリア"){
                        ansMap[ans.a_question].push(ans.a_answer);
                      }
                      else{
                        ansMap[ans.a_question].push(ans.a_answertextarea);
                      }
                    });

                    // paramを表示
                    Object.keys(ansMap).forEach(function (key) {
                      console.log(key + ":" + ansMap[key]);
                    });

                    response.render(
                      'pages/qa'
                      , {
                        results: result.rows
                        , ansMap: ansMap
                        , title: parentTitle
                        , answerCompPathObj: answerCompPathObj
                        , resSfid: resSfid
                        , respondentInfo: respondentInfo
                        , previewFlg: false
                        , answeredFlg: true
                      }
                    );
                  }
                });
              }
              // 未回答の場合、入力項目を活性とし、回答内容を入力させる
              else{
                console.log('未回答');
                response.render(
                  'pages/qa'
                  , {
                    results: result.rows
                    , ansMap: ansMap
                    , title: parentTitle
                    , answerCompPathObj: answerCompPathObj
                    , resSfid: resSfid
                    , respondentInfo: respondentInfo
                    , previewFlg: false
                    , answeredFlg: false
                  }
                );
              }
            }
          });
        }
        // 回答者を取得できなかった場合
        else{
          // エラー画面を表示
          // 画面に表示するメッセージを設定
          alertType  = 'alert-danger';
          msg = '該当する情報を取得できませんでした。下記までご連絡ください。';
          response.render('pages/error', {alertType: alertType, message: msg, respondentInfo: respondentInfo} );
        }
      }
    });
  });
});

app.post('/qa', function (request, response) {
  console.log(request.body);
  // paramを表示
  Object.keys(request.body).forEach(function (key) {
    console.log(key + ":" + request.body[key]);
  });

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    var answerDateTime = moment().format('YYYY-MM-DDTHH:mm:ss');
    var seibetsu = '';
    if(!(typeof request.body.seibetsuRadio === "undefined") && request.body.seibetsuRadio != ''){
      seibetsu = request.body.seibetsuRadio;
    }

    var nendai = request.body.nendaiList;
    var resSfid = '';
    if(!(typeof request.body.resSfid === "undefined") && request.body.resSfid != ''){
      resSfid = decrypt(request.body.resSfid);
      console.log('resSfid:' + resSfid);
    }
    console.log('answerDateTime:' + answerDateTime);
    console.log('resSfid:' + resSfid);
    console.log('seibetsu:' + seibetsu);
    console.log('nendai:' + nendai);

    // 回答詳細INSERT
    var insertStr = 'INSERT INTO salesforce.answerdetails__c (question__c,questionnairerespondent__c,answer__c,answertextarea__c,createddate) VALUES ';
    var insertValStr = '';
    var insertPlaceHolder=[];
    var insertPlaceHolderCnt=1;

    // 入力内容を解析
    Object.keys(request.body).forEach(function (key) {
      // 対象の設問レコードIdを取得
      if(key.startsWith('select_')){
        questionSfid = key.replace('select_', '');
      }
      else if(key.startsWith('radioBtn_')){
        questionSfid = key.replace('radioBtn_', '');
      }
      else if(key.startsWith('chkBox_')){
        questionSfid = key.replace('chkBox_', '');
      }
      else if(key.startsWith('txtBox_')){
        questionSfid = key.replace('txtBox_', '');
      }
      else if(key.startsWith('txtArea_')){
        questionSfid = key.replace('txtArea_', '');
      }
      else{
        return;
      }

      //SQLの設定値
      var answer = request.body[key];
      //チェックボックス(複数指定)
      if(answer instanceof Array){
        answer.forEach(function (value, index) {
          if(insertValStr != ''){
            insertValStr += ',';
          }
          insertValStr += ' ( $' + (insertPlaceHolderCnt++) + ',$' + (insertPlaceHolderCnt++) + ',$' + (insertPlaceHolderCnt++)+ ',$' + (insertPlaceHolderCnt++) + ',$' + (insertPlaceHolderCnt++) + ') ';
          insertPlaceHolder.push(questionSfid);
          insertPlaceHolder.push(resSfid);
          insertPlaceHolder.push(value); //回答に値を設定
          insertPlaceHolder.push('');    //回答（テキスト）は空白
          insertPlaceHolder.push(answerDateTime);
        });
      }
      else{
        if(insertValStr != ''){
          insertValStr += ',';
        }
        // テキストエリア
        if(key.startsWith('txtArea_')){
          insertValStr += ' ( $' + (insertPlaceHolderCnt++) + ',$' + (insertPlaceHolderCnt++) + ',$' + (insertPlaceHolderCnt++)+ ',$' + (insertPlaceHolderCnt++) + ',$' + (insertPlaceHolderCnt++) + ') ';
          insertPlaceHolder.push(questionSfid);
          insertPlaceHolder.push(resSfid);
          insertPlaceHolder.push('');      //回答は空白
          insertPlaceHolder.push(answer);  //回答（テキスト）に値を設定
          insertPlaceHolder.push(answerDateTime);
        }
        //チェックボックス(複数指定)、テキストエリア以外
        else{
          insertValStr += ' ( $' + (insertPlaceHolderCnt++) + ',$' + (insertPlaceHolderCnt++) + ',$' + (insertPlaceHolderCnt++)+ ',$' + (insertPlaceHolderCnt++) + ',$' + (insertPlaceHolderCnt++) + ') ';
          insertPlaceHolder.push(questionSfid);
          insertPlaceHolder.push(resSfid);
          insertPlaceHolder.push(answer); //回答に値を設定
          insertPlaceHolder.push('');     //回答（テキスト）は空白
          insertPlaceHolder.push(answerDateTime);
        }
      }
    });

    // 回答のINSERT文を生成
    var insertQuery = insertStr + insertValStr;
    console.log("insertQuery:" + insertQuery);
    console.log(insertPlaceHolder);

    // 回答者のステータス更新UPDATE
    var updatePlaceHolder=[];
    var updatePlaceHolderCnt=1;
    var updateStr = 'UPDATE salesforce.questionnairerespondent__c ';
    updateStr += ' SET '
    updateStr += ' answerdatetime__c = $' + (updatePlaceHolderCnt++) + ' ';
    updateStr += ', nendai__c = $' + (updatePlaceHolderCnt++) + ' ';
    updateStr += ', seibetsu__c = $' + (updatePlaceHolderCnt++) + ' ';
    var whereStr = ' WHERE sfid = $' + (updatePlaceHolderCnt++) + ' ';
    updatePlaceHolder.push(answerDateTime);
    updatePlaceHolder.push(nendai);
    updatePlaceHolder.push(seibetsu);
    updatePlaceHolder.push(resSfid);

    var queryStr = updateStr + whereStr;
    console.log('queryStr:' + queryStr);
    console.log(updatePlaceHolder);
    var isSuccess = false;

    // 回答内容をINSERT
    client.query(insertQuery, insertPlaceHolder, function(err, result) {
      done();
      if (err){
        isSuccess = false;
        console.error(err); response.send("Error " + err);
      }
      else{
        isSuccess = true;
        console.log('result:' + result);
        // 回答済みフラグを更新
        client.query(queryStr, updatePlaceHolder, function(err, result) {
          done();
          if (err){
            console.error(err); response.send("Error " + err);
          }
          else{
            console.log('result:' + result);
            response.redirect('qaCompleted');
          }
        });
      }
    });
  });
});
app.get('/qaCompleted', function(request, response) {
  console.log('アンケート回答したよ');
  console.log(request.session.respondentName);
  // セッションから回答者名を取得
  var respondentName = request.session.respondentName;

  var respondentInfo = {
    "name": respondentName,
    "seibetsu": "",
    "nendai": ""
  };
  response.render('pages/qaCompleted', {respondentInfo: respondentInfo});
});

//SendGridのWebhookを受けた処理
app.post('/sendgridwebhook', function(request, response) {
  console.log('メールステータスプッシュ来たよ');
//  console.log(request.body);

  //ここから下はLoopの可能性あり
  for (var i=0;i<request.body.length;i++){

    var req = request.body[i];

    //更新対象データの確認
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      var answerDateTime = moment().format('YYYY-MM-DDTHH:mm:ss');
      var sfid = req.salesforceid;
      //キーが空の場合は何もしない
      if (sfid !== undefined){
        var selectStr = 'SELECT * FROM salesforce.questionnairerespondent__c WHERE sendgrid_key__c = $1';
        var selectPlaceHolder=[sfid];
        console.log("selectStr:" + selectStr);
        console.log(selectPlaceHolder);

        var alertType = '';
        var msg = '';

        client.query(selectStr, selectPlaceHolder, function(err, respondentResult) {
          var respondent;
          done();
          if (err){
            console.error(err);
            response.send('HTTP/1.1 300');
          }

          var updateStr='';
          var updatePlaceHolder=[answerDateTime,respondentResult.rows[0].sendgrid_key__c];
          switch (req.event){
            case 'delivered':
              //maildelivereddatetime__c を更新する
              updateStr = "UPDATE salesforce.questionnairerespondent__c SET maildelivereddatetime__c = $1 WHERE sendgrid_key__c = $2 AND maildelivereddatetime__c IS NULL";
              break;
            case 'open':
              //mailopendatetime__c を更新する
              updateStr = "UPDATE salesforce.questionnairerespondent__c SET mailopendatetime__c = $1 WHERE sendgrid_key__c = $2 AND mailopendatetime__c IS NULL";
              break;
            case 'click':
              //linkclickdatetime__c を更新する
              updateStr = "UPDATE salesforce.questionnairerespondent__c SET linkclickdatetime__c = $1 WHERE sendgrid_key__c = $2 AND linkclickdatetime__c IS NULL";
              break;
          }
          console.log("updateStr:" + updateStr);
          console.log(updatePlaceHolder);
  
          var isSuccess = false;
          // 連携内容を更新
          client.query(updateStr, updatePlaceHolder, function(err, result) {
            done();
            if (err){
              console.error(err);
              response.send('HTTP/1.1 300');
            }else{
              console.log(result);
            }
          });
        });
      }
    });
  }
  response.send('HTTP/1.1 201');
});

//---------- 暗号化&複合化 ----------//
var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
var passphrase = "7IeZlmfz";

var encrypt = (text) => {
  var cipher = crypto.createCipher(algorithm,passphrase);
  var crypted = cipher.update(text,'utf8','hex');
  crypted += cipher.final('hex');
  return crypted;
}

var decrypt = (text) => {
  var decipher = crypto.createDecipher(algorithm,passphrase);
  var dec = decipher.update(text,'hex','utf8');
  dec += decipher.final('utf8');
  return dec;
}
//---------- 暗号化&複合化 ----------//

