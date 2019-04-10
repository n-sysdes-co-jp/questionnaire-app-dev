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

### 3. 環境変数の設定
#### Heroku側
 settingsからConfig Varsを変更します。
- `API_KEY`：SendGridで設定したAPIキーを入力します。
- `FROM_ADDRESS`：YABUMIアンケートの送信元メールアドレスを設定します。
- `PAGEURL`：YABUMIアンケートの回答画面URLを設定します。
- `SF_PASSWORD`：Salesforceのパスワードを入力します。（1.で入手したセキュリティトークンを連結してください）
- `SF_USERID`：SalesforceのユーザーIDを入力します。

#### Salesforce側
 カスタム表示ラベルを変更します。    
- `QUESTONNAIRE_URL`：`https://(デプロイしたアプリのName).herokuapp.com/preview?`

### 4. Heroku アドオンの設定    
#### Heroku Connect    
- Installed add-ons から、Heroku Connect のコンソールを開きます。    
- パッケージをインストールしたSalesforce組織と接続します。    
 [HerokuConnectMapping.json](https://github.com/n-sysdes-co-jp/questionnaire-app-dev/blob/master/contents/HerokuConnectMapping.json)    

#### Heroku Scheduler    
- Installed add-ons から、Heroku Scheduler のコンソールを開きます。    
- メール送信バッチ`$ node sendmailloop.js`を登録します。    
 ※Herokuのコンソールから手動でバッチを実行することも可能です。    

#### SendGrid    
 webhookの設定を行います。    
- Installed add-ons の SendGrid を選択し、SendGrid のコンソールを開きます。    
- Settings > Mail Settings から、`Event Notification`をonにします。    
- `HTTP POST URL`を以下のように設定します。    
 `https://(HerokuのEmailアドレス):(Herokuのパスワード)@(デプロイしたアプリのName).herokuapp.com/sendgridwebhook`    
- `SELECT ACTIONS`から、`Delivered`、`Opened`、`Clicked`にチェックを付けます。    

## 使用方法    
 実際の操作方法については、操作マニュアルをご覧ください。    
 [YABUMIアンケートマニュアル](https://github.com/n-sysdes-co-jp/questionnaire-app-dev/blob/master/contents/manual.pdf)    

## ライセンス    
 [MIT](https://github.com/n-sysdes-co-jp/questionnaire-app-dev/blob/master/LICENSE)    

## その他    
 各種セキュリティにつきましては、必要に応じてご設定ください。    
