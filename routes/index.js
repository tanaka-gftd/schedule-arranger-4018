'use strict';

const express = require('express');
const router = express.Router();
const Schedule = require('../models/schedule');

router.get('/', async (req, res, next) => {
  const title = '予定調整くん';  //タイトル設定

  //処理全体を認証済みかどうか（req.userオブジェクトが存在するかどうか）で振り分ける
  if (req.user) {

    //自分が作成した予定を絞り込み、作成日時順にソート
    const schedules = await Schedule.findAll({  //findAll...条件に合うレコードを全て抽出する関数
      where: {
        createdBy: req.user.id
      },
      order: [['updatedAt', 'DESC']]
    });

    //ログイン済みの場合は、indexテンプレートにユーザ名と作成した予定を渡す
    res.render('index', {
      title: title,
      user: req.user,
      schedules: schedules
    });
  } else {

    //未ログインの場合は、予定は表示しない（N予備校の解説文と異なり、user: req.userも不要なはず）
    res.render('index', { title: title/* , user: req.user */ })
  }
})

module.exports = router;
