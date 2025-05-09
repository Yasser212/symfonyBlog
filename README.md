# Symfony 7 Blog Tutorial: Building a Blog with Advanced Image Management

This tutorial guides you through creating a simple blog application using **Symfony 7**, with a strong focus on managing images for user profiles and articles. We'll start with a Symfony skeleton project, install necessary bundles, design a database, create entities, and implement robust image management using **VichUploaderBundle**, **Validator**, and **LiipImagineBundle**. The image management section covers uploading, validating, storing, and displaying images in multiple sizes (thumbnails, article page, index page).

## Prerequisites
- PHP 8.2 or higher
- Composer
- MySQL or another database supported by Doctrine
- Basic knowledge of Symfony and PHP

## Step 1: Setting Up the Symfony 7 Skeleton Project

First, create a new Symfony 7 project using the skeleton template, which provides a minimal setup that we can build upon.

```bash
composer create-project symfony/skeleton blog
cd blog
```

### Installing Essential Bundles
We'll install bundles one by one, explaining their purpose:

1. **Doctrine ORM** (`symfony/orm-pack`): Provides database integration and entity management.
   ```bash
   composer require symfony/orm-pack
   ```

2. **Maker Bundle** (`symfony/maker-bundle`): Simplifies generating controllers, entities, and forms.
   ```bash
   composer require --dev symfony/maker-bundle
   ```

3. **Twig** (`symfony/twig-pack`): Template engine for rendering views.
   ```bash
   composer require symfony/twig-pack
   ```

4. **Security** (`symfony/security-bundle`): Handles user authentication and authorization.
   ```bash
   composer require symfony/security-bundle
   ```

5. **VichUploaderBundle** (`vich/uploader-bundle`): Manages file uploads, particularly images, with integration for Doctrine entities.
   ```bash
   composer require vich/uploader-bundle
   ```

6. **Validator** (`symfony/validator`): Validates form inputs, including image file constraints (e.g., size, mime type).
   ```bash
   composer require symfony/validator
   ```

7. **LiipImagineBundle** (`liip/imagine-bundle`): Processes images to create resized versions (e.g., thumbnails, article images).
   ```bash
   composer require liip/imagine-bundle
   ```

8. **TailwindBundle** (`symfonycasts/tailwind-bundle`):
   ```bash
   composer require symfonycasts/tailwind-bundle
   ```

### Configure the Database
Edit `.env` to set your database connection:

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/symfonyblog?serverVersion=8.0&charset=utf8mb4"
```

## Step 2: Database Design

Our blog needs two main entities: **User** (for profiles with profile images) and **Article** (with associated images). Here’s the database schema:

- **User**:
  - `id`: Integer, primary key, auto-increment
  - `username`: Varchar(255), unique
  - `email`: Varchar(255), unique
  - `password`: Varchar(255)
  - `profile_image`: Varchar(255), nullable (stores profile image filename)

- **Article**:
  - `id`: Integer, primary key, auto-increment
  - `title`: Varchar(255)
  - `content`: Text
  - `image`: Varchar(255), nullable (stores article image filename)
  - `created_at`: Datetime
  - `author_id`: Integer, foreign key referencing `User(id)`

This schema supports user profiles with optional profile images and articles with optional images, linked to authors.

## Step 3: Create SQL Database and Entities

### Create the Database
Run the following command to create the database:

```bash
php bin/console doctrine:database:create
or php bin/console d:d:c 
```

### Create Entities
Use the Maker Bundle to generate `User` and `Article` entities.

#### User Entity
```bash
php bin/console make:user
```
- Name: `User`
- Interactive mode: Follow prompts to include username, email, and password.
- After generation, add the `profileImage` property manually.

Edit `src/Entity/User.php`:

```php
<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Vich\UploaderBundle\Mapping\Annotation as Vich;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[Vich\Uploadable]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    private ?string $email = null;

    #[ORM\Column]
    private array $roles = [];

    #[ORM\Column]
    private ?string $password = null;

    #[ORM\Column(length: 255, unique: true)]
    private ?string $username = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $profileImage = null;

    #[Vich\UploadableField(mapping: 'profile_images', fileNameProperty: 'profileImage')]
    #[Assert\Image(
        maxSize: '2M',
        mimeTypes: ['image/jpeg', 'image/png'],
        mimeTypesMessage: 'Please upload a valid JPEG or PNG image.'
    )]
    private ?File $profileImageFile = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTime $updatedAt = null;

    // Getters and setters...

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;
        return $this;
    }

    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';
        return array_unique($roles);
    }

    public function setRoles(array $roles): static
    {
        $this->roles = $roles;
        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;
        return $this;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(string $username): static
    {
        $this->username = $username;
        return $this;
    }

    public function eraseCredentials(): void
    {
        // Clear sensitive data if needed
    }

    public function getProfileImage(): ?string
    {
        return $this->profileImage;
    }

    public function setProfileImage(?string $profileImage): static
    {
        $this->profileImage = $profileImage;
        return $this;
    }

    public function setProfileImageFile(?File $profileImageFile = null): void
    {
        $this->profileImageFile = $profileImageFile;
        if ($profileImageFile) {
            $this->updatedAt = new \DateTime();
        }
    }

    public function getProfileImageFile(): ?File
    {
        return $this->profileImageFile;
    }

    public function getUpdatedAt(): ?\DateTime
    {
        return $this->updated SNDarray
    }

    public function setUpdatedAt(?\DateTime $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }
}
```

#### Article Entity
```bash
php bin/console make:entity Article
```
Add fields: `title` (string), `content` (text), `image` (string, nullable), `createdAt` (datetime), `author` (relation to User).

Edit `src/Entity/Article.php`:

```php
<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Vich\UploaderBundle\Mapping\Annotation as Vich;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[Vich\Uploadable]
class Article
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: 'text')]
    private ?string $content = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $image = null;

    #[Vich\UploadableField(mapping: 'article_images', fileNameProperty: 'image')]
    #[Assert\Image(
        maxSize: '5M',
        mimeTypes: ['image/jpeg', 'image/png'],
        mimeTypesMessage: 'Please upload a valid JPEG or PNG image.'
    )]
    private ?File $imageFile = null;

    #[ORM\Column(type: 'datetime')]
    private ?\DateTime $createdAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $author = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTime $updatedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    // Getters and setters...

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(string $content): static
    {
        $this->content = $content;
        return $this;
    }

    public function getImage(): ?string
    {
        return $this->image;
    }

    public function setImage(?string $image): static
    {
        $this->image = $image;
        return $this;
    }

    public function setImageFile(?File $imageFile = null): void
    {
        $this->imageFile = $imageFile;
        if ($imageFile) {
            $this->updatedAt = new \DateTime();
        }
    }

    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    public function getCreatedAt(): ?\DateTime
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTime $createdAt): static
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;
        return $this;
    }

    public function getUpdatedAt(): ?\DateTime
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTime $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }
}
```

### Update the Database Schema
Create and apply migrations:

```bash
php bin/console make:migration
php bin/console doctrine:migrations:migrate
```

## Step 4: Image Management with Forms

This is the core of the tutorial, focusing on uploading, validating, storing, and displaying images in multiple sizes.

### Configure VichUploaderBundle
Edit `config/packages/vich_uploader.yaml`:

```yaml
vich_uploader:
    db_driver: orm
    mappings:
        profile_images:
            uri_prefix: /uploads/profile_images
            upload_destination: '%kernel.project_dir%/public/uploads/profile_images'
            namer: Vich\UploaderBundle\Naming\UniqidNamer
        article_images:
            uri_prefix: /uploads/article_images
            upload_destination: '%kernel.project_dir%/public/uploads/article_images'
            namer: Vich\UploaderBundle\Naming\UniqidNamer
```

- **Explanation**:
  - `uri_prefix`: Public URL path for accessing images.
  - `upload_destination`: Filesystem path where images are stored.
  - `namer`: Generates unique filenames to avoid conflicts.

Create the upload directories:

```bash
mkdir -p public/uploads/profile_images public/uploads/article_images
```

### Configure LiipImagineBundle
Edit `config/packages/liip_imagine.yaml`:

```yaml
liip_imagine:
    resolvers:
        default:
            web_path: ~
    filter_sets:
        profile_thumbnail:
            filters:
                thumbnail: { size: [50, 50], mode: inset }
        profile_large:
            filters:
                thumbnail: { size: [200, 200], mode: inset }
        article_thumbnail:
            filters:
                thumbnail: { size: [100, 100], mode: inset }
        article_index:
            filters:
                thumbnail: { size: [300, 200], mode: inset }
        article_page:
            filters:
                thumbnail: { size: [600, 400], mode: inset }
```

- **Explanation**:
  - `profile_thumbnail`: 50x50px for user avatars in lists.
  - `profile_large`: 200x200px for user profile pages.
  - `article_thumbnail`: 100x100px for small previews.
  - `article_index`: 300x200px for article listings.
  - `article_page`: 600x400px for full article views.
  - `mode: inset`: Preserves aspect ratio, fits within specified dimensions.

### Create Forms
#### User Profile Form
```bash
php bin/console make:form UserType
```

Edit `src/Form/UserType.php`:

```php
<?php

namespace App\Form;

use App\Entity\User;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Vich\UploaderBundle\Form\Type\VichImageType;

class UserType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('username')
            ->add('email')
            ->add('profileImageFile', VichImageType::class, [
                'required' => false,
                'allow_delete' => true,
                'download_uri' => false,
                'image_uri' => true,
                'label' => 'Profile Image',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => User::class,
        ]);
    }
}
```

#### Article Form
```bash
php bin/console make:form ArticleType
```

Edit `src/Form/ArticleType.php`:

```php
<?php

namespace App\Form;

use App\Entity\Article;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Vich\UploaderBundle\Form\Type\VichImageType;

class ArticleType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('title')
            ->add('content')
            ->add('imageFile', VichImageType::class, [
                'required' => false,
                'allow_delete' => true,
                'download_uri' => false,
                'image_uri' => true,
                'label' => 'Article Image',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Article::class,
        ]);
    }
}
```

- **Explanation**:
  - `VichImageType`: Handles file uploads, integrates with VichUploaderBundle.
  - `required: false`: Images are optional.
  - `allow_delete`: Allows removing the uploaded image.
  - Validation is handled by the `#[Assert\Image]` constraints in the entities.

### Create Controller and Views
#### User Profile Controller
```bash
php bin/console make:controller UserController
```

Edit `src/Controller/UserController.php`:

```php
<?php

namespace App\Controller;

use App\Entity\User;
use App\Form\UserType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/user')]
class UserController extends AbstractController
{
    #[Route('/edit/{id}', name: 'user_edit')]
    public function edit(Request $request, User $user, EntityManagerInterface $em): Response
    {
        $form = $this->createForm(UserType::class, $user);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $em->flush();
            $this->addFlash('success', 'Profile updated successfully.');
            return $this->redirectToRoute('user_edit', ['id' => $user->getId()]);
        }

        return $this->render('user/edit.html.twig', [
            'form' => $form->createView(),
            'user' => $user,
        ]);
    }
}
```

Create `templates/user/edit.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}Edit Profile{% endblock %}

{% block body %}
    <h1>Edit Profile</h1>

    {{ form_start(form) }}
        {{ form_row(form.username) }}
        {{ form_row(form.email) }}
        {{ form_row(form.profileImageFile) }}
        {% if user.profileImage %}
            <img src="{{ user.profileImage|imagine_filter('profile_thumbnail') }}" alt="Profile Thumbnail">
            <img src="{{ user.profileImage|imagine_filter('profile_large') }}" alt="Profile Large">
        {% endif %}
        <button type="submit" class="btn btn-primary">Save</button>
    {{ form_end(form) %}
{% endblock %}
```

#### Article Controller
```bash
php bin/console make:controller ArticleController
```

Edit `src/Controller/ArticleController.php`:

```php
<?php

namespace App\Controller;

use App\Entity\Article;
use App\Form\ArticleType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/article')]
class ArticleController extends AbstractController
{
    #[Route('/new', name: 'article_new')]
    public function new(Request $request, EntityManagerInterface $em): Response
    {
        $article = new Article();
        $article->setAuthor($this->getUser());
        $form = $this->createForm(ArticleType::class, $article);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $em->persist($article);
            $em->flush();
            $this->addFlash('success', 'Article created successfully.');
            return $this->redirectToRoute('article_index');
        }

        return $this->render('article/new.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    #[Route('/', name: 'article_index')]
    public function index(EntityManagerInterface $em): Response
    {
        $articles = $em->getRepository(Article::class)->findAll();
        return $this->render('article/index.html.twig', [
            'articles' => $articles,
        ]);
    }

    #[Route('/{id}', name: 'article_show')]
    public function show(Article $article): Response
    {
        return $this->render('article/show.html.twig', [
            'article' => $article,
        ]);
    }
}
```

Create `templates/article/new.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}New Article{% endblock %}

{% block body %}
    <h1>Create New Article</h1>

    {{ form_start(form) }}
        {{ form_row(form.title) }}
        {{ form_row(form.content) }}
        {{ form_row(form.imageFile) }}
        <button type="submit" class="btn btn-primary">Create</button>
    {{ form_end(form) %}
{% endblock %}
```

Create `templates/article/index.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}Articles{% endblock %}

{% block body %}
    <h1>Articles</h1>

    {% for article in articles %}
        <div>
            <h2>{{ article.title }}</h2>
            {% if article.image %}
                <img src="{{ article.image|imagine_filter('article_index') }}" alt="{{ article.title }}">
            {% endif %}
            <p>{{ article.content|slice(0, 100) }}...</p>
            <a href="{{ path('article_show', {'id': article.id}) }}">Read more</a>
        </div>
    {% endfor %}
{% endblock %}
```

Create `templates/article/show.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}{{ article.title }}{% endblock %}

{% block body %}
    <h1>{{ article.title }}</h1>

    {% if article.image %}
        <img src="{{ article.image|imagine_filter('article_page') }}" alt="{{ article.title }}">
    {% endif %}
    <p>{{ article.content }}</p>
    <p>By {{ article.author.username }} on {{ article.createdAt|date('Y-m-d') }}</p>
{% endblock %}
```

Create a base template `templates/base.html.twig`:

```twig
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{% block title %}Welcome!{% endblock %}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    {% block stylesheets %}{% endblock %}
</head>
<body>
    <div class="container">
        {% for message in app.flashes('success') %}
            <div class="alert alert-success">{{ message }}</div>
        {% endfor %}
        {% block body %}{% endblock %}
    </div>
    {% block javascripts %}{% endblock %}
</body>
</html>
```

### Image Management Details
- **Uploading**: Handled by `VichImageType` in forms, which integrates with VichUploaderBundle to store files in `public/uploads/`.
- **Validation**: Symfony Validator’s `#[Assert\Image]` ensures only JPEG/PNG files under specified sizes (2MB for profiles, 5MB for articles) are accepted.
- **Storage**: Images are stored in `public/uploads/profile_images` and `public/uploads/article_images` with unique filenames generated by `UniqidNamer`.
- **Displaying Multiple Sizes**: LiipImagineBundle creates resized images on-the-fly using defined filter sets (`profile_thumbnail`, `article_index`, etc.). The `imagine_filter` Twig filter applies these transformations.
- **Performance**: LiipImagineBundle caches resized images to reduce server load. Ensure your server has write permissions for the cache directory (`var/cache`).

### Security Considerations
- Restrict upload directories to prevent execution of malicious files (e.g., add `.htaccess` for Apache).
- Validate file types and sizes strictly to prevent abuse.
- Sanitize filenames to avoid directory traversal attacks.

## Step 5: Testing the Application
1. Start the Symfony server:
   ```bash
   symfony server:start
   ```
2. Register a user (implement a registration form using `make:registration-form` if needed).
3. Edit the user profile at `/user/edit/{id}` to upload a profile image.
4. Create articles at `/article/new` to upload article images.
5. View articles at `/article/` (index) and `/article/{id}` (show) to see images in different sizes.

## Conclusion
This tutorial demonstrated how to build a Symfony 7 blog with robust image management. By using **VichUploaderBundle** for uploads, **Validator** for input validation, and **LiipImagineBundle** for image resizing, we created a scalable system for handling user profile and article images. The application supports multiple image sizes, ensuring optimal display for thumbnails, index pages, and article pages.