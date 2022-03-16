'use strict';
const request = require('supertest');
const assert = require('assert');
const app = require('../app');
const passportStub = require('passport-stub');
const User = require('../models/user');
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');
const Availability = require('../models/availability');
const Comment = require('../models/comment');

describe('/login', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ username: 'testuser' });
   });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('ログインのためのリンクが含まれる', () => {
    return request(app)
      .get('/login')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/auth\/github"/)
      .expect(200);
  });

  test('ログイン時はユーザー名が表示される', () => {
    return request(app)
      .get('/login')
      .expect(/testuser/)
      .expect(200);
  });
});

describe('/logout', () => {
  test('/ にリダイレクトされる', () => {
    return request(app)
      .get('/logout')
      .expect('Location', '/')
      .expect(302);
  });
});

describe('/schedules', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('予定が作成でき、表示される', async (done) => {
    await User.upsert({ userId: 0, username: 'testuser' });
    request(app)
      .post('/schedules')
      .send({
        scheduleName: 'テスト予定1',
        memo: 'テストメモ1\r\nテストメモ2',
        candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3'
      })
      .expect('Location', /schedules/)
      .expect(302)
      .end((err, res) => {
        const createdSchedulePath = res.headers.location;
        request(app)
          .get(createdSchedulePath)
          .expect(/テスト予定1/)
          .expect(/テストメモ1/)
          .expect(/テストメモ2/)
          .expect(/テスト候補1/)
          .expect(/テスト候補2/)
          .expect(/テスト候補3/)
          .expect(200)
          .end((err, res) => { deleteScheduleAggregate(createdSchedulePath.split('/schedules/')[1], done, err);});
      });
  });
});

describe('/schedules/:scheduleId/users/:userId/candidates/:candidateId', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('出欠が更新できる', async (done) => {
    await User.upsert({ userId: 0, username: 'testuser' });
    request(app)
      .post('/schedules')
      .send({ scheduleName: 'テスト出欠更新予定1', memo: 'テスト出欠更新メモ1', candidates: 'テスト出欠更新候補1' })
      .end(async (err, res) => {
        const createdSchedulePath = res.headers.location;
        const scheduleId = createdSchedulePath.split('/schedules/')[1];
        const candidate = await Candidate.findOne({
          where: { scheduleId: scheduleId }
        });
        // 更新がされることをテスト
        const userId = 0;
        request(app)
          .post(`/schedules/${scheduleId}/users/${userId}/candidates/${candidate.candidateId}`)
          .send({ availability: 2 }) // 出席に更新
          .expect('{"status":"OK","availability":2}')
          .end(async (err, res) => {
            const availabilities = await Availability.findAll({
              where: { scheduleId: scheduleId }
            });
            assert.strictEqual(availabilities.length, 1);
            assert.strictEqual(availabilities[0].availability, 2);
            deleteScheduleAggregate(scheduleId, done, err);
          });
      });
  });
});

describe('/schedules/:scheduleId/users/:userId/comments', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('コメントが更新できる', async (done) => {
    await User.upsert({ userId: 0, username: 'testuser' });
    request(app)
      .post('/schedules')
      .send({ 
        scheduleName: 'テストコメント更新予定1', 
        memo: 'テストコメント更新メモ1', 
        candidates: 'テストコメント更新候補1' 
      })
      .end((err, res) => {
        const createdSchedulePath = res.headers.location;
        const scheduleId = createdSchedulePath.split('/schedules/')[1];
        // 更新がされることをテスト
        const userId = 0;
        request(app)
          .post(`/schedules/${scheduleId}/users/${userId}/comments`)
          .send({ comment: 'testcomment' })
          .expect('{"status":"OK","comment":"testcomment"}')
          .end(async (err, res) => {
            const comments = await Comment.findAll({
              where: { scheduleId: scheduleId }
            });
            assert.strictEqual(comments.length, 1);
            assert.strictEqual(comments[0].comment, 'testcomment');
            deleteScheduleAggregate(scheduleId, done, err);
          });
      });
  });
});

async function deleteScheduleAggregate(scheduleId, done, err) {
  const comments = await Comment.findAll({
    where: { scheduleId: scheduleId }
  });
  const promisesCommentDestroy = comments.map((c) => { return c.destroy(); });
  await Promise.all(promisesCommentDestroy);

  const availabilities = await Availability.findAll({
    where: { scheduleId: scheduleId }
  });
  const promisesAvailabilityDestroy = availabilities.map((a) => { return a.destroy(); });
  await Promise.all(promisesAvailabilityDestroy);
  const candidates = await Candidate.findAll({
    where: { scheduleId: scheduleId }
  });
  const promisesCandidateDestroy = candidates.map((c) => { return c.destroy(); });
  await Promise.all(promisesCandidateDestroy);
  const s = await Schedule.findByPk(scheduleId);
  await s.destroy();
  if (err) return done(err);
  done();
}
