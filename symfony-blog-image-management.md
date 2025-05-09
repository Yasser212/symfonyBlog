# Symfony 7 Blog: Comprehensive Image Management Tutorial

This tutorial will guide you through implementing robust image management in a Symfony 7 blog application, with focus on handling user profile images and article featured images.

## Table of Contents
1. [Project Setup](#project-setup)
2. [Database Design](#database-design)
3. [Entity Creation](#entity-creation)
4. [Installing Image Management Bundles](#installing-image-management-bundles)
5. [Configuration](#configuration)
6. [Image Uploading Implementation](#image-uploading-implementation)
7. [Image Validation](#image-validation)
8. [Image Processing with LiipImagineBundle](#image-processing-with-liipimagine-bundle)
9. [Displaying Images in Templates](#displaying-images-in-templates)
10. [Cleanup and Best Practices](#cleanup-and-best-practices)

## Project Setup

Let's start by creating a new Symfony 7 project:

```bash
# Create a new Symfony project
symfony new symfony_blog --webapp

# Navigate to project directory
cd symfony_blog

# Start the Symfony development server
symfony server:start
```

## Database Design

For our blog, we'll need at least two entities that will handle images:

1. **User** - For user profiles with profile pictures
2. **Article** - For blog posts with featured images

Here's a simplified database schema: (it could be differnet according to your db design)

**Users Table:**
- id (PK)
- email
- password
- name
- profile_image_name (stores filename)
- profile_image_size
- profile_image_mime_type
- updated_at (for image versioning)

**Articles Table:**
- id (PK)
- title
- content
- featured_image_name
- featured_image_size
- featured_image_mime_type
- published_at
- updated_at
- user_id (FK to Users)

## Entity Creation

Let's create our entities:

```bash
# Create User entity
symfony console make:user

# Create Article entity
symfony console make:entity Article
```

Now we'll modify these entities to support image uploads. We'll be using VichUploaderBundle to handle file uploads.

## Installing Image Management Bundles

We need several packages to handle image management effectively:

```bash
# Install VichUploaderBundle for handling file uploads
composer require vich/uploader-bundle

# Install LiipImagineBundle for image processing/resizing
composer require liip/imagine-bundle

# Install Validator for image validation
composer require symfony/validator
```

When the installer asks if you want to execute the recipe, you should select:
- `[y] Yes` for a one-time execution of setup scripts
- `[a] Yes for all packages` if you're installing multiple packages and trust them all
- `[p] Yes permanently` if you don't want to be prompted again for this project
- `[n] No` if you want to configure everything manually

The recipe configures default settings for each bundle, saving you time on manual setup.

Ps: Symfony Flex recipes are automation scripts that handle the configuration of packages in your Symfony application. Since the liip/imagine-bundle recipe comes from the "contrib" repository (community contributions) rather than the official Symfony recipes, it asks for your permission before executing it.

## Configuration

### VichUploaderBundle Configuration

Create or update `config/packages/vich_uploader.yaml`:

```yaml
vich_uploader:
    db_driver: orm
    metadata:
        type: attribute
    
    mappings:
        profile_images:
            uri_prefix: /uploads/profiles
            upload_destination: '%kernel.project_dir%/public/uploads/profiles'
            namer: Vich\UploaderBundle\Naming\SmartUniqueNamer
            delete_on_update: true
            delete_on_remove: true
        
        article_images:
            uri_prefix: /uploads/articles
            upload_destination: '%kernel.project_dir%/public/uploads/articles'
            namer: Vich\UploaderBundle\Naming\SmartUniqueNamer
            delete_on_update: true
            delete_on_remove: true
```

### LiipImagineBundle Configuration

Update `config/packages/liip_imagine.yaml`:

```yaml
liip_imagine:
    driver: "gd" # or "imagick" if installed
    
    resolvers:
        default:
            web_path: ~
    
    filter_sets:
        cache: ~
        
        # Profile image filters
        profile_thumb:
            quality: 85
            filters:
                thumbnail: { size: [100, 100], mode: outbound }
                
        profile_medium:
            quality: 85
            filters:
                thumbnail: { size: [250, 250], mode: outbound }
        
        # Article image filters
        article_thumb:
            quality: 75
            filters:
                thumbnail: { size: [300, 200], mode: outbound }
                
        article_medium:
            quality: 85
            filters:
                thumbnail: { size: [800, 450], mode: outbound }
                
        article_full:
            quality: 95
            filters:
                scale: { dim: [1200, 1200] }
```
ps:  What is GD?
GD is a PHP extension used for manipulating images.
It supports operations like resize, crop, rotate, add watermarks, and more.
It's built into PHP on most systems by default.

Create the upload directories:

```bash
mkdir -p public/uploads/profiles
mkdir -p public/uploads/articles
mkdir -p public/media/cache
```

Don't forget to set proper permissions:

```bash
chmod -R 777 public/uploads
chmod -R 777 public/media/cache
```

Note: In production, use more restrictive permissions.

## Entity Configuration

Let's update our entities to use VichUploaderBundle's features.

### User Entity

Update `src/Entity/User.php`:

```php
<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\HttpFoundation\File\File;
use Vich\UploaderBundle\Mapping\Annotation as Vich;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[UniqueEntity(fields: ['email'], message: 'There is already an account with this email')]
#[Vich\Uploadable]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    #[Assert\Email]
    #[Assert\NotBlank]
    private ?string $email = null;

    #[ORM\Column]
    private array $roles = [];

    /**
     * @var string The hashed password
     */
    #[ORM\Column]
    private ?string $password = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $name = null;
    
    // Image properties
    #[Vich\UploadableField(mapping: 'profile_images', fileNameProperty: 'profileImageName', size: 'profileImageSize', mimeType: 'profileImageMimeType')]
    #[Assert\File(
        maxSize: '2M',
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        mimeTypesMessage: 'Please upload a valid image (JPEG, PNG, WEBP)'
    )]
    private ?File $profileImageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $profileImageName = null;

    #[ORM\Column(nullable: true)]
    private ?int $profileImageSize = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $profileImageMimeType = null;
    
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\OneToMany(mappedBy: 'author', targetEntity: Article::class)]
    private Collection $articles;

    public function __construct()
    {
        $this->articles = new ArrayCollection();
    }

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

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    /**
     * @see UserInterface
     */
    public function eraseCredentials(): void
    {
        // If you store any temporary, sensitive data on the user, clear it here
        // $this->plainPassword = null;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): static
    {
        $this->name = $name;

        return $this;
    }

    /**
     * @return Collection<int, Article>
     */
    public function getArticles(): Collection
    {
        return $this->articles;
    }

    public function addArticle(Article $article): static
    {
        if (!$this->articles->contains($article)) {
            $this->articles->add($article);
            $article->setAuthor($this);
        }

        return $this;
    }

    public function removeArticle(Article $article): static
    {
        if ($this->articles->removeElement($article)) {
            // set the owning side to null (unless already changed)
            if ($article->getAuthor() === $this) {
                $article->setAuthor(null);
            }
        }

        return $this;
    }
    
    // Profile image getter/setter methods
    public function setProfileImageFile(?File $profileImageFile = null): void
    {
        $this->profileImageFile = $profileImageFile;

        if (null !== $profileImageFile) {
            // It is required that at least one field changes if you are using doctrine
            // otherwise the event listeners won't be called and the file is lost
            $this->updatedAt = new \DateTimeImmutable();
        }
    }

    public function getProfileImageFile(): ?File
    {
        return $this->profileImageFile;
    }

    public function setProfileImageName(?string $profileImageName): void
    {
        $this->profileImageName = $profileImageName;
    }

    public function getProfileImageName(): ?string
    {
        return $this->profileImageName;
    }
    
    public function setProfileImageSize(?int $profileImageSize): void
    {
        $this->profileImageSize = $profileImageSize;
    }

    public function getProfileImageSize(): ?int
    {
        return $this->profileImageSize;
    }

    public function setProfileImageMimeType(?string $profileImageMimeType): void
    {
        $this->profileImageMimeType = $profileImageMimeType;
    }

    public function getProfileImageMimeType(): ?string
    {
        return $this->profileImageMimeType;
    }
    
    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): void
    {
        $this->updatedAt = $updatedAt;
    }
}
```

### Article Entity

Now let's create the Article entity:

```php
<?php

namespace App\Entity;

use App\Repository\ArticleRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Vich\UploaderBundle\Mapping\Annotation as Vich;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ArticleRepository::class)]
#[Vich\Uploadable]
class Article
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 5, max: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    private ?string $content = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $publishedAt = null;

    #[ORM\ManyToOne(inversedBy: 'articles')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $author = null;
    
    // Image properties
    #[Vich\UploadableField(mapping: 'article_images', fileNameProperty: 'featuredImageName', size: 'featuredImageSize', mimeType: 'featuredImageMimeType')]
    #[Assert\File(
        maxSize: '5M',
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        mimeTypesMessage: 'Please upload a valid image (JPEG, PNG, WEBP)'
    )]
    private ?File $featuredImageFile = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $featuredImageName = null;

    #[ORM\Column(nullable: true)]
    private ?int $featuredImageSize = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $featuredImageMimeType = null;
    
    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

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

    public function getPublishedAt(): ?\DateTimeImmutable
    {
        return $this->publishedAt;
    }

    public function setPublishedAt(?\DateTimeImmutable $publishedAt): static
    {
        $this->publishedAt = $publishedAt;

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
    
    // Featured image getter/setter methods
    public function setFeaturedImageFile(?File $featuredImageFile = null): void
    {
        $this->featuredImageFile = $featuredImageFile;

        if (null !== $featuredImageFile) {
            // It is required that at least one field changes if you are using doctrine
            // otherwise the event listeners won't be called and the file is lost
            $this->updatedAt = new \DateTimeImmutable();
        }
    }

    public function getFeaturedImageFile(): ?File
    {
        return $this->featuredImageFile;
    }

    public function setFeaturedImageName(?string $featuredImageName): void
    {
        $this->featuredImageName = $featuredImageName;
    }

    public function getFeaturedImageName(): ?string
    {
        return $this->featuredImageName;
    }
    
    public function setFeaturedImageSize(?int $featuredImageSize): void
    {
        $this->featuredImageSize = $featuredImageSize;
    }

    public function getFeaturedImageSize(): ?int
    {
        return $this->featuredImageSize;
    }

    public function setFeaturedImageMimeType(?string $featuredImageMimeType): void
    {
        $this->featuredImageMimeType = $featuredImageMimeType;
    }

    public function getFeaturedImageMimeType(): ?string
    {
        return $this->featuredImageMimeType;
    }
    
    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeImmutable $updatedAt): void
    {
        $this->updatedAt = $updatedAt;
    }
}
```

## Create Database & Migration

Now let's create our database and migrations:

```bash
# Configure DATABASE_URL in .env.local first, then:
symfony console doctrine:database:create
symfony console make:migration
symfony console doctrine:migrations:migrate
```

## Image Uploading Implementation

### Form Types

Let's create form types for both User and Article entities:

#### User Form Type

```php
<?php

namespace App\Form;

use App\Entity\User;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Vich\UploaderBundle\Form\Type\VichImageType;

class UserProfileType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Your Name',
            ])
            ->add('email', EmailType::class, [
                'label' => 'Email Address',
            ])
            ->add('profileImageFile', VichImageType::class, [
                'label' => 'Profile Picture',
                'required' => false,
                'allow_delete' => true,
                'delete_label' => 'Delete profile picture',
                'download_uri' => false,
                'image_uri' => true,
                'asset_helper' => true,
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => User::class,
        ]);
    }
}
```

#### Article Form Type

```php
<?php

namespace App\Form;

use App\Entity\Article;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Vich\UploaderBundle\Form\Type\VichImageType;

class ArticleType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('title', TextType::class, [
                'label' => 'Article Title',
                'attr' => ['placeholder' => 'Enter article title'],
            ])
            ->add('content', TextareaType::class, [
                'label' => 'Article Content',
                'attr' => [
                    'rows' => 10,
                    'placeholder' => 'Write your article content here...',
                ],
            ])
            ->add('featuredImageFile', VichImageType::class, [
                'label' => 'Featured Image',
                'required' => false,
                'allow_delete' => true,
                'delete_label' => 'Remove featured image',
                'download_uri' => false,
                'image_uri' => true,
                'asset_helper' => true,
                'attr' => ['accept' => 'image/*'],
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Article::class,
        ]);
    }
}
```

### Controllers

Now let's create controllers to handle the forms:

#### User Profile Controller

```php
<?php

namespace App\Controller;

use App\Entity\User;
use App\Form\UserProfileType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_USER')]
class ProfileController extends AbstractController
{
    #[Route('/profile', name: 'app_profile')]
    public function index(): Response
    {
        return $this->render('profile/index.html.twig', [
            'user' => $this->getUser(),
        ]);
    }
    
    #[Route('/profile/edit', name: 'app_profile_edit')]
    public function edit(Request $request, EntityManagerInterface $entityManager): Response
    {
        $user = $this->getUser();
        $form = $this->createForm(UserProfileType::class, $user);
        $form->handleRequest($request);
        
        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();
            
            $this->addFlash('success', 'Profile updated successfully!');
            return $this->redirectToRoute('app_profile');
        }
        
        return $this->render('profile/edit.html.twig', [
            'form' => $form,
        ]);
    }
}
```

#### Article Controller

```php
<?php

namespace App\Controller;

use App\Entity\Article;
use App\Form\ArticleType;
use App\Repository\ArticleRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/article')]
class ArticleController extends AbstractController
{
    #[Route('/', name: 'app_article_index', methods: ['GET'])]
    public function index(ArticleRepository $articleRepository): Response
    {
        return $this->render('article/index.html.twig', [
            'articles' => $articleRepository->findBy([], ['publishedAt' => 'DESC']),
        ]);
    }

    #[Route('/new', name: 'app_article_new', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_USER')]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $article = new Article();
        $article->setAuthor($this->getUser());
        $article->setPublishedAt(new \DateTimeImmutable());
        
        $form = $this->createForm(ArticleType::class, $article);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($article);
            $entityManager->flush();

            $this->addFlash('success', 'Article created successfully!');
            return $this->redirectToRoute('app_article_show', ['id' => $article->getId()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('article/new.html.twig', [
            'article' => $article,
            'form' => $form,
        ]);
    }

    #[Route('/{id}', name: 'app_article_show', methods: ['GET'])]
    public function show(Article $article): Response
    {
        return $this->render('article/show.html.twig', [
            'article' => $article,
        ]);
    }

    #[Route('/{id}/edit', name: 'app_article_edit', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_USER')]
    public function edit(Request $request, Article $article, EntityManagerInterface $entityManager): Response
    {
        // Check if the current user is the author
        if ($article->getAuthor() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('You cannot edit this article.');
        }
        
        $form = $this->createForm(ArticleType::class, $article);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            $this->addFlash('success', 'Article updated successfully!');
            return $this->redirectToRoute('app_article_show', ['id' => $article->getId()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('article/edit.html.twig', [
            'article' => $article,
            'form' => $form,
        ]);
    }

    #[Route('/{id}', name: 'app_article_delete', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function delete(Request $request, Article $article, EntityManagerInterface $entityManager): Response
    {
        // Check if the current user is the author
        if ($article->getAuthor() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('You cannot delete this article.');
        }
        
        if ($this->isCsrfTokenValid('delete'.$article->getId(), $request->request->get('_token'))) {
            $entityManager->remove($article);
            $entityManager->flush();
            $this->addFlash('success', 'Article deleted successfully!');
        }

        return $this->redirectToRoute('app_article_index', [], Response::HTTP_SEE_OTHER);
    }
}
```

## Image Processing with LiipImagineBundle

LiipImagineBundle allows us to create thumbnails and different image sizes on-the-fly. We've already configured it above. Now we need to add routes to make it work:

Add to your `config/routes.yaml`:

```yaml
# LiipImagineBundle routes
_liip_imagine:
    resource: "@LiipImagineBundle/Resources/config/routing.yaml"
```

## Displaying Images in Templates

### Profile Template

Create `templates/profile/index.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}Your Profile{% endblock %}

{% block body %}
<div class="container my-5">
    <div class="row">
        <div class="col-md-4">
            <div class="card">
                <div class="card-header">Profile Picture</div>
                <div class="card-body text-center">
                    {% if user.profileImageName %}
                        <img src="{{ vich_uploader_asset(user, 'profileImageFile') | imagine_filter('profile_medium') }}" 
                             alt="{{ user.name }}" class="img-fluid rounded-circle">
                    {% else %}
                        <div class="bg-light p-4 rounded-circle d-inline-block">
                            <i class="bi bi-person" style="font-size: 5rem;"></i>
                        </div>
                    {% endif %}
                </div>
                <div class="card-footer">
                    <a href="{{ path('app_profile_edit') }}" class="btn btn-primary w-100">Edit Profile</a>
                </div>
            </div>
        </div>
        <div class="col-md-8">
            <div class="card">
                <div class="card-header">User Information</div>
                <div class="card-body">
                    <h3>{{ user.name ?: 'User' }}</h3>
                    <p><strong>Email:</strong> {{ user.email }}</p>
                    <p><strong>Member since:</strong> {{ user.updatedAt ? user.updatedAt|date('F j, Y') : 'N/A' }}</p>
                </div>
            </div>
            
            <div class="card mt-4">
                <div class="card-header">Your Articles</div>
                <div class="card-body">
                    {% if user.articles.count > 0 %}
                        <ul class="list-group">
                            {% for article in user.articles %}
                                <li class="list-group-item">
                                    <a href="{{ path('app_article_show', {'id': article.id}) }}">{{ article.title }}</a>
                                    <span class="badge bg-secondary float-end">{{ article.publishedAt|date('M d, Y') }}</span>
                                </li>
                            {% endfor %}
                        </ul>
                    {% else %}
                        <p class="text-muted">You haven't published any articles yet.</p>
                        <a href="{{ path('app_article_new') }}" class="btn btn-success">Create Your First Article</a>
                    {% endif %}
                </div>
            </div>
        </div>
    </div>
</div>
{% endblock %}
```

Create `templates/profile/edit.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}Edit Profile{% endblock %}

{% block body %}
<div class="container my-5">
    <div class="row justify-content-center">
        <div class="col-md-8">
            <div class="card">
                <div class="card-header">
                    <h3 class="mb-0">Edit Your Profile</h3>
                </div>
                <div class="card-body">
                    {{ form_start(form, {'attr': {'class': 'needs-validation'}}) }}
                    
                    <div class="mb-3">
                        {{ form_label(form.name) }}
                        {{ form_widget(form.name, {'attr': {'class': 'form-control'}}) }}
                        {{ form_errors(form.name) }}
                    </div>
                    
                    <div class="mb-3">
                        {{ form_label(form.email) }}
                        {{ form_widget(form.email, {'attr': {'class': 'form-control'}}) }}
                        {{ form_errors(form.email) }}
                    </div>
                    