# YABUMIアンケート(YABUMI questionnaire)

## 概要
 YABUMIアンケートは、Salesforceで作成したレコードをHeroku ConnectでHeroku側と連携し、SendGridを使用して対象者へ一斉にアンケートを送信することができるアプリケーションです。    
 
## 前提事項
 以下が必要となります。
- Salesforce組織
- Herokuアカウント

## セットアップ方法
### 1. Salesforce非管理パッケージのインストール
 [こちら](https://login.salesforce.com/packaging/installPackage.apexp?p0=04t7F000005IrP8)から、Salesforceにパッケージをインストールします。    
 ※Lightningコンポーネントの使用には、`私のドメイン`を有効にする必要があります。    
 ※また、`セキュリティトークンのリセット`を行いセキュリティトークンを入手してください。    

### 2. Herokuにアプリをデプロイ
 <a href="https://heroku.com/deploy?template=https://github.com/n-sysdes-co-jp/questionnaire-app-dev/tree/master">
   <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy">
 </a>    

### 3. Heroku アドオンの設定    
#### Heroku Connect    
- Installed add-ons から、Heroku Connect のコンソールを開きます。    
- パッケージをインストールしたSalesforce組織と接続します。    
 [HerokuConnectMapping.json](https://github.com/n-sysdes-co-jp/questionnaire-app-dev/blob/master/contents/HerokuConnectMapping.json)    

#### Heroku Scheduler    
- Installed add-ons から、Heroku Scheduler のコンソールを開きます。    
- メール送信バッチ`$ node sendmailloop.js`を登録します。    
 ※Herokuのコンソールから手動でバッチを実行することも可能です。    

#### SendGrid    
- Installed add-ons の SendGrid を選択し、SendGrid のコンソールを開きます。    
- Settings > API Keys > Create API Key から、APIキーを生成します。    
- Webhookの設定    
	- Settings > Mail Settings から、`Event Notification`をonにします。    
	- `HTTP POST URL`を以下のように設定します。    
	 `https://(HerokuのEmailアドレス):(Herokuのパスワード)@(デプロイしたアプリのName).herokuapp.com/sendgridwebhook`    
	- `SELECT ACTIONS`から、`Delivered`、`Opened`、`Clicked`にチェックを付けます。    

### 4. 環境変数の設定
#### Heroku側
 settingsからConfig Varsを変更します。    

|変数名|設定内容|補足|
|:---|:---|:---|
|`API_KEY`|SendGridのAPIキー|アンケート送信を行うためにSendGridのAPIキーが必要です。<br>３.で生成したSendGridのAPIキーを入力します。|
|`FROM_ADDRESS`|任意のメールアドレス|YABUMIアンケート回答者へ送信されるメールの送信元メールアドレスを設定します。|
|`PAGEURL`|`https://(デプロイしたアプリのName).herokuapp.com/qa?sfid=`|YABUMIアンケート回答者へ送信されるメールに記載される、YABUMIアンケートの回答画面URLです。|
|`SF_USERID`|SalesforceのユーザーID|管理者権限を持つユーザーのIDを入力します。|
|`SF_PASSWORD`|Salesforceのパスワード|上記ユーザーのパスワードに、<br>１.で入手したセキュリティトークンを連結して入力します。|


#### Salesforce側
 アンケート画面のプレビューに必要な画面URLを設定します。    
 設定 > クイック検索ボックスに「ラベル」と入力し、「カスタム表示ラベル」をクリックします。    
- `QUESTONNAIRE_URL`：`https://(デプロイしたアプリのName).herokuapp.com/preview?`    

## 使用方法    
 実際の操作方法については、操作マニュアルをご覧ください。    
 [YABUMIアンケートマニュアル](https://github.com/n-sysdes-co-jp/questionnaire-app-dev/blob/master/contents/manual.pdf)    

## ライセンス    
 [MIT](https://github.com/n-sysdes-co-jp/questionnaire-app-dev/blob/master/LICENSE)    

## その他    
 各種セキュリティにつきましては、必要に応じてご設定ください。    
