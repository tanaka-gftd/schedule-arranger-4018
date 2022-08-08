'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const { v4: uuidv4 } = require('uuid');  //UUIDを利用できるようにする
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');
const User = require('../models/user');

router.get('/new', authenticationEnsurer, (req, res, next) => {
  res.render('new', { user: req.user });
});

router.post('/', authenticationEnsurer, async (req, res, next) => {

  /* 
  　sequelize のデータベースの処理は基本的に全て、非同期IOで実行されるので、適宜awaitをつける。
　　メソッドチェインで書きたい場合は、then関数を用いる
　*/

  const scheduleId = uuidv4();  //UUIDの文字列を作成し、スケジュールIDとする
  const updatedAt = new Date();  //更新日時生成

  //予定をデータベース内に保存する
  const schedule = await Schedule.create({
    scheduleId: scheduleId,
    //DBサイドではscheduleNameの文字数上限は255で設定されているのでsliceする。文字列未入力なら'（名称未設定）'とする
    scheduleName: req.body.scheduleName.slice(0, 255) || '（名称未設定）',  
    memo: req.body.memo,
    createdBy: req.user.id,  //ユーザーIDを登録者とする
    updatedAt: updatedAt
  });

  //リクエストのボディ部から候補日程を取得して、配列に加工して保存
  const candidateNames = req.body.candidates.trim().split('\n').map((s) => s.trim()).filter((s) => s !== "");
  
  //候補日程の配列candidateNamesから、DBに保存するcandidatesオブジェクトを作成
  const candidates = candidateNames.map((c) => { 
    return {
      candidateName: c,
      scheduleId: schedule.scheduleId
    };
  });

  //candidatesオブジェクトをDBのCandidateに保存
  await Candidate.bulkCreate(candidates);  //bulkCreate...複数のオブジェクトをDBに保管する関数
  
  //候補日程保存後はリダイレクト
  res.redirect('/schedules/' + schedule.scheduleId);
});

//スケジュール表示用ページ
router.get('/:scheduleId', authenticationEnsurer, async(req, res, next) => {
  
  //sequelizeを利用してテーブルを結合（ScheduleテーブルとUserテーブル）し、情報を取得
  const schedule = await Schedule.findOne({  //findOne関数...そのデータモデルに対応するデータを 1 行だけ取得する
    include: [
      {
        model: User,  
        attributes: ['userId', 'username']   //ユーザ情報と、ユーザIDを取得
      }
    ],
    where: {
      scheduleId: req.params.scheduleId  //スケジュールIDで抽出するデータを絞る
    },
    order: [['updatedAt', 'DESC']]  //予定の更新日時の降順に並び替え
  });

  //上記の処理でschedule(予定)が見つかった場合は、その候補一覧を取得していく
  if (schedule) {
    const candidates = await Candidate.findAll({
      where: { scheduleId: schedule.scheduleId},
      order: [['candidateId', 'ASC']]  //候補IDの昇順に並び替え（=作られた順番）
    });
    //DBから取得したデータをテンプレート（schedule.pug）に渡して、レンダリング
    res.render('schedule', {
      user: req.user,
      schedule: schedule,
      candidates: candidates,
      users: [req.user]
    });
  } else {
    //予定が見つからない場合は、404エラーを返すようにする
    const err = new Error('指定された予定は見つかりません');
    err.status = 404;
    next(err);
  }
});

module.exports = router;