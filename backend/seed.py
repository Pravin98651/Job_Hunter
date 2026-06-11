from app.db.session import SessionLocal
from app.models.user import User
import uuid

def seed_user():
    db = SessionLocal()
    try:
        user_id = uuid.UUID('00000000-0000-0000-0000-000000000000')
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            new_user = User(
                id=user_id,
                email='test@test.com',
                job_title='AI Engineer',
                location='Remote',
                min_salary=120000,
                skills_required=['Python']
            )
            db.add(new_user)
            db.commit()
            print("Successfully seeded dummy user.")
        else:
            print("User already exists.")
    except Exception as e:
        print(f"Error seeding user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_user()
