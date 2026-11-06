import test from 'node:test';
import assert from 'node:assert/strict';
import { specialistRequest, specialistForSession } from '../../src/shared/specialist-request.js';

test('news assignments go to the news reader, with the entire brief preserved', () => {
  for (const text of ['Đọc báo hôm nay', 'Đọc báo về giá vàng tuần này', 'nhờ nhân sự đọc báo tổng hợp tình hình AI', 'Tôi muốn nhân sự đọc báo về AI', 'Bạn có thể đọc báo về AI được không?', 'tong hop tin tuc Viet Nam va nuoc ngoai', 'Tìm bài báo về xe điện', 'Please read the news about AI', 'Can you please read the latest news?', 'Summarize the latest news about Vietnam']) {
    assert.deepEqual(specialistRequest(text), { kind: 'news', topic: text }, text);
  }
});

test('software work mentioning the news reader still goes to developers', () => {
  for (const text of ['Sửa tính năng đọc báo để báo cáo có ảnh', 'Sửa luồng đọc báo', 'Fix the news reader API', 'Implement a feature to read news', 'Xây dựng giao diện tổng hợp tin tức', 'Refactor the news reader', 'write tests', 'Read README.md', 'hôm nay trời đẹp', '']) assert.equal(specialistRequest(text), null, text);
});

test('mentioning the reader, refusing a task or describing past reading does not launch a job', () => {
  for (const text of ['Đừng đọc báo', 'Không cần đọc báo về AI', 'Tôi không muốn nhân sự đọc báo', 'Nhân sự đọc báo là ai?', 'Đọc báo nghĩa là gì?', 'Tôi vừa đọc báo về AI', 'Hôm nay tôi đọc báo về AI', 'I read news every morning', 'Please do not read the news', 'Can you explain how to read news?', 'Sửa lỗi: "đọc báo về AI" bị giao nhầm']) assert.equal(specialistRequest(text), null, text);
});

test('specialist identity uses the exact session after completion and only unbound active folders as fallback', () => {
  const jobs = [{ id: 'done', sid: 'news-sid', dir: 'C:\\news\\done', kind: 'news', status: 'done' }, { id: 'active', dir: 'C:\\news\\active', kind: 'news', status: 'run' }];
  assert.equal(specialistForSession({ sid: 'news-sid', cwd: '/different', jobs })?.id, 'done');
  assert.equal(specialistForSession({ sid: 'new', cwd: 'c:/NEWS/active/', jobs })?.id, 'active');
  assert.equal(specialistForSession({ sid: 'other', cwd: 'C:\\news\\done', jobs }), null);
  assert.equal(specialistForSession({ cwd: '', jobs }), null);
  assert.equal(specialistForSession({ cwd: '/News', jobs: [{ status: 'run', dir: '/news' }] }), null);
});
