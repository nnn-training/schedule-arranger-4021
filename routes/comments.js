'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [ 'query' ] });

router.post(
  '/:scheduleId/users/:userId/comments',
  authenticationEnsurer,
  async (req, res, next) => {
    const scheduleId = req.params.scheduleId;
    const userId = parseInt(req.params.userId);
    const comment = req.body.comment;

    const data = {
      userId,
      scheduleId,
      comment: comment.slice(0, 255)
    };
    await prisma.comment.upsert({
      where: {
        commentCompositeId: {
          userId,
          scheduleId
        }
      },
      update: data,
      create: data
    });

    res.json({ status: 'OK', comment: comment });
  }
);

module.exports = router;
