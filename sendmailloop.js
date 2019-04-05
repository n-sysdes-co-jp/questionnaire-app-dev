var express = require('express');
var url = require('url');
var app = express();
var router = express.Router();
var bodyParser = require('body-parser');
var moment = require('moment');

var dotenv   = require('dotenv');
dotenv.load();
var api_key  = process.env.API_KEY;
var from_address = process.env.FROM_ADDRESS;
var pageurl = process.env.PAGEURL;
var sendgrid = require('sendgrid')(api_key);
var email    = new sendgrid.Email();

var mailString = '';



app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use( bodyParser.json() );
app.use( bodyParser.urlencoded() );

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


//PosgreID格納
var pIds = new Array();
//メールアドレス格納
var Emails = new Array();
//アンケートSFID格納
var QuestionnaireIds = new Array();
//アンケート回答者SFID格納
var RespondentIds = new Array();
//アンケート名格納
var QuestionName = new Array();
//アンケート回答者名
var RespondentNames = new Array();
//メール本文
var MailHeaderText = new Array();
var MailBodyText = new Array();
var MailFooterText = new Array();
//Sendgrid用ユニークキー
var UniqueArgs_SfId = new Array();

var pg = require('pg');

//送信対象のメールアドレス等取得
pg.connect(process.env.DATABASE_URL, function(err, client, done) {

  var queryStr = "";
      queryStr += " SELECT";
      queryStr += "     tq1.*";
      queryStr += "     ,COALESCE(tq1.mei__c,'') mei";
      queryStr += "     ,replace(tq2.mail_header_text__c,chr(10),'.\r\n.') mail_header_text__c";
      queryStr += "     ,replace(tq2.mail_body_text__c,chr(10),'.\r\n.') mail_body_text__c";
      queryStr += "     ,replace(tq2.mail_foot_text__c,chr(10),'.\r\n.') mail_foot_text__c";
      queryStr += "     ,tq1.sendgrid_key__c";
      queryStr += " FROM";
      queryStr += "     salesforce.questionnairerespondent__c tq1";
      queryStr += "     ,salesforce.questionnaire__c tq2";
      queryStr += " WHERE";
      queryStr += "     sendmailflg__c = false";
      queryStr += " and tq1.questionnaire__c = tq2.sfid";
      queryStr += " and tq2.openflg__c = true";
      queryStr += " ORDER BY";
      queryStr += "     tq1.sendgrid_key__c";

  client.query(queryStr, function(err, result) {
    done();
    if (err){
      console.error(err); response.send("Error " + err);
    }
    else{
      if(result.rows.length>0){
        //格納処理
        for(i=0; i < result.rows.length; i++){

          //PostgreID格納
          pIds[i] = result.rows[i].id;
          //メールアドレス格納
          Emails[i] = result.rows[i].email__c;
          //アンケート回答者SFID格納
          QuestionnaireIds[i] = encrypt(result.rows[i].questionnaire__c);
          //アンケートSFID格納
          RespondentIds[i] = encrypt(result.rows[i].sfid);
          //アンケート名称格納
          QuestionName[i] = result.rows[i].questionnairename__c;
          //アンケート回答者名称格納
          RespondentNames[i] = result.rows[i].sei__c + ' ' + result.rows[i].mei;
          //メールヘッダ本文
          MailHeaderText[i] = result.rows[i].mail_header_text__c;
          //メールボディ本文
          MailBodyText[i] = result.rows[i].mail_body_text__c;
          //メールフッタ本文
          MailFooterText[i] = result.rows[i].mail_foot_text__c;
          //Sendgrid用ユニークキー
          UniqueArgs_SfId[i] = result.rows[i].sendgrid_key__c;
        }

        for(i=0; i < Emails.length; i++){
          console.log("メール：" + Emails[i] + "、アンケート回答者SFID：" + QuestionnaireIds[i] + "、アンケートSFID：" + RespondentIds[i] + "、メールKey：" + result.rows[i].sendgrid_key__c);
          email.setTos(Emails[i]);
          email.setFrom(from_address);
          email.setSubject(QuestionName[i]);
          //URLのテンプレ：https://questionnaire-app-dev.herokuapp.com/qa?sfid=<アンケートSFID>&resSfid=<アンケート回答者SFID>

          //メール本文作成 [なぜか改行が2つないとSendgridが改行をつぶしてしまう。。。]
          var txt = "";
          txt = txt + RespondentNames[i] + ' 様' + '\r\n\r\n';
          txt = txt + makenewline(MailHeaderText[i]) + '\r\n\r\n';
          txt = txt + makenewline(MailBodyText[i]) + '\r\n\r\n';
          txt = txt + pageurl + QuestionnaireIds[i] + '&resSfid=' + RespondentIds[i] + '\r\n\r\n';
          txt = txt + makenewline(MailFooterText[i]) + '\r\n\r\n';

          email.setText(txt);
          email.addUniqueArg('questionname', QuestionName[i]);
          email.addUniqueArg('salesforceid',UniqueArgs_SfId[i]);

          //送信処理実行
          sendgrid.send(email, function(err, json) {
            if (err) { return console.error(err); }
            console.log(JSON.stringify(json) + ' at ' + moment().format('YYYY-MM-DD HH:mm:ss'));
          });
        }

        //メール送信日時設定
        var sendmailDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
        console.log('sendmailDateTime:' + sendmailDateTime);
        
        // UPDATE文
        var updateStr = 'UPDATE salesforce.questionnairerespondent__c SET sendmaildatetime__c = \'' + sendmailDateTime + '\' , sendmailflg__c = true';
        var idStr = '';
        for(i=0; i < pIds.length; i++){
          if(idStr==''){
            idStr = pIds[i];
          }else{
            idStr += ',' + pIds[i];
          }
        }
        var whereStr = ' WHERE id IN (' + idStr + ')';
        var queryStr = updateStr + whereStr;
        console.log(queryStr);
        
        client.query(queryStr, function(err, result){
          if (err){
            isSuccess = false;
            console.error(err); response.send("Error " + err);
          }
          //バッチ終了日時(Sendgridのsendの結果を待たない部分)
          var endTime = moment().format('YYYY-MM-DDTHH:mm:ss');
          console.log('Sync End At:' + endTime);
        });
      }
    }
  });
});

//---------- 暗号化&複合化 ----------//
var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
var passphrase = "7IeZlmfz";

var encrypt = (text) => {
  var cipher = crypto.createCipher(algorithm,passphrase)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

var decrypt = (text) => {
  var decipher = crypto.createDecipher(algorithm,passphrase)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}
//---------- 暗号化&複合化 ----------//
//---------- メール改行作成 ---------//
function makenewline(txt){
    var mail = txt.split('.\r\n.');
    var tmp = "";
    for (var j=0;j<mail.length;j++){
        tmp = tmp + mail[j] + '\r\n\r\n';
    }
    return tmp;
}
//------------ 改行作成 -------------//
