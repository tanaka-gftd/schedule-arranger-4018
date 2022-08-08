/* 認証済みであるかどうかをチェックするモジュール */
/* 認証済みでない場合は、 ログイン画面へと遷移させる*/

'use strict';

function ensure(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

module.exports = ensure;