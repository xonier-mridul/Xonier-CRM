import unittest
from app.utils.lead_assignment_access import require_lead_assigner, require_lower_assignee
from app.utils.custom_exception import AppException


def account(code, ident='actor', **fields):
    return {'_id': ident, 'userRole': [{'code': code, **fields}]}


class LeadAssignmentAccessTests(unittest.TestCase):
    def test_regular_user_cannot_assign_even_with_permission_or_high_power(self):
        for target in ['USER', 'MANAGER', 'COMPANY_ADMIN']:
            with self.subTest(target=target), self.assertRaises(AppException):
                require_lower_assignee(account('USER', power=100, canManageBelow=True), account(target, 'target'))

    def test_hierarchy(self):
        for actor, target, allowed in [
            ('MANAGER', 'USER', True), ('MANAGER', 'MANAGER', False),
            ('MANAGER', 'COMPANY_ADMIN', False), ('COMPANY_ADMIN', 'MANAGER', True),
            ('COMPANY_ADMIN', 'COMPANY_ADMIN', False), ('COMPANY_ADMIN', 'SUPER_ADMIN', False),
            ('SUPER_ADMIN', 'COMPANY_ADMIN', True),
        ]:
            with self.subTest(actor=actor, target=target):
                if allowed:
                    require_lower_assignee(account(actor), account(target, 'target'))
                else:
                    with self.assertRaises(AppException):
                        require_lower_assignee(account(actor), account(target, 'target'))

    def test_mixed_roles_use_highest_target_role(self):
        target = account('USER', 'target')
        target['userRole'].append({'code': 'COMPANY_ADMIN'})
        with self.assertRaises(AppException):
            require_lower_assignee(account('MANAGER'), target)

    def test_missing_roles_fail_closed(self):
        with self.assertRaises(AppException):
            require_lead_assigner({'userRole': []})
        with self.assertRaises(AppException):
            require_lower_assignee(account('MANAGER'), {'_id': 'target', 'userRole': []})
