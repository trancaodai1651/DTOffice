import test from 'node:test';
import assert from 'node:assert/strict';
import { departmentRequest } from '../../src/shared/department-request.js';
test('explicit manager requests dispatch to the department, discussion and negatives do not', () => {
  for (const text of ['Giao việc cho quản lý phòng Dev làm trang bán hàng', 'Hãy giao cho trưởng phòng dev sửa lỗi', 'Assign to manager development a dashboard']) assert.equal(departmentRequest(text)?.team, 'dev', text);
  for (const text of ['Giao cho quản lý phòng marketing viết bài', 'Giao việc cho CMO chiến dịch', 'Giao cho quản lý phòng markting làm bộ ảnh']) assert.equal(departmentRequest(text)?.lead, 'cmo', text);
  for (const text of ['Không giao cho quản lý phòng dev', 'Đừng giao cho quản lý phòng marketing', 'Tại sao giao cho quản lý phòng dev bị lỗi?', 'Sửa chức năng giao việc cho quản lý phòng dev', 'Tôi muốn có chức năng giao việc cho quản lý phòng dev', 'hello']) assert.equal(departmentRequest(text), null, text);
});
