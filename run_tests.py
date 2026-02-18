from app import app
from models import Car


def run():
    client = app.test_client()

    def print_summary(name, resp):
        text = resp.get_data(as_text=True)
        snippet = text[:300].replace('\n', ' ')
        print(f"{name}: {resp.status_code} | {snippet[:200]}")

    res = client.get('/')
    print_summary('GET /', res)

    res = client.get('/listings')
    print_summary('GET /listings', res)

    res = client.get('/chatbot')
    print_summary('GET /chatbot', res)

    res = client.post('/chatbot', data={'message': 'battery health check'})
    print_summary('POST /chatbot', res)

    res = client.post('/admin/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    print_summary('POST /admin/login', res)

    res = client.get('/admin')
    print_summary('GET /admin', res)

    car_data = {
        'model': 'Test EV',
        'year': '2022',
        'price': '50000',
        'range_km': '350',
        'charge_time_min': '30',
        'description': 'Test car',
        'image_url': 'http://example.com/car.jpg'
    }

    res = client.post('/admin/car/new', data=car_data, follow_redirects=True)
    print_summary('POST /admin/car/new', res)

    res = client.get('/admin')
    print_summary('GET /admin after add', res)

    with app.app_context():
        count = Car.query.filter_by(model='Test EV').count()
        print('DB count for Test EV:', count)


if __name__ == '__main__':
    run()
