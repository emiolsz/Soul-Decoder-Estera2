import unittest
from app import app
from metodyka import generuj_profil_urodzenia

class ProfileTests(unittest.TestCase):
    def test_original_emilia(self):
        self.assertEqual(generuj_profil_urodzenia(6,11,1974), {'Prawa':6,'Lewa':11,'Gleboka':21,'Talent':3,'Wezel':10,'Tikkun':4})
    def test_api_and_static_files(self):
        with app.test_client() as client:
            self.assertEqual(client.get('/').status_code,200)
            self.assertEqual(client.get('/calculator.mjs').status_code,200)
            self.assertEqual(client.get('/assets/report-content.json').status_code,200)
            result=client.post('/api/profile',json={'name':'Emilia','status':'living','birth':'1974-11-06'})
            self.assertEqual(result.status_code,200)
            self.assertEqual(result.json['profile']['Gleboka'],21)
            for payload in [{'name':'','status':'living','birth':'1974-11-06'},{'name':'Emilia','status':'living','birth':'1900-02-29'},{'name':'Emilia','status':'deceased','birth':'1974-11-06'}]:
                self.assertEqual(client.post('/api/profile',json=payload).status_code,400)

if __name__ == '__main__':
    unittest.main()
