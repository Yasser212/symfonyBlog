# Symfony 7 Blog Tutorial: Building a Blog with Advanced Image Management

Creating a simple blog application using **Symfony 7**, with a strong focus on managing images for articles. We'll start with a Symfony skeleton project, install necessary bundles, design a database, create entity, and implement robust image management using **VichUploaderBundle**, **Validator**, and **LiipImagineBundle**. The image management section covers uploading, validating, storing, and displaying images in multiple sizes (thumbnails, article page, index page).

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

1. **Doctrine ORM** `(symfony/orm-pack)`: Provides database integration and entity management.
   ```bash
   composer require symfony/orm-pack
   ```

2. **Maker Bundle** `(symfony/maker-bundle)`: Simplifies generating controllers, entities, and forms.
   ```bash
   composer require --dev symfony/maker-bundle
   ```

3. **Twig** `(symfony/twig-pack)`: Template engine for rendering views.
   ```bash
   composer require symfony/twig-pack
   ```

4. **VichUploaderBundle** `(vich/uploader-bundle)`: Manages file uploads, particularly images, with integration for Doctrine entities.
   ```bash
   composer require vich/uploader-bundle
   ```

5. **Validator** `(symfony/validator)`: Validates form inputs, including image file constraints (.g., size, mime type).
   ```bash
   composer require symfony/validator
   ```

6. **LiipImagineBundle** `(liip/imagine-bundle)`: Processes images to create resized versions (e.g., thumbnails, article images).
   ```bash
   composer require liip/imagine-bundle
   ```

7. **Forms** : Provides form handling and rendering functionality.
   ```bash
   composer require form     
   ```
   
8. **Asset Component** `(symfony/asset)` : Manages asset URLs (e.g., images, CSS, JS) in templates and supports versioning and base path configuration.
    ```bash
    composer require symfony/asset
    ```

9. **TailwindBundle** `(symfonycasts/tailwind-bundle)`: Integrates Tailwind CSS into Symfony for modern, utility-first styling.
   ```bash
   composer require symfonycasts/tailwind-bundle
   ```


### Configure Tailwind

```bash
php bin/console tailwind:init  
php bin/console tailwind:build -w
```

# or manually:

## add to tailwind.config.js to the root folder:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./assets/**/*.js",
    "./templates/**/*.html.twig",
    "./vendor/symfony/twig-bridge/Resources/views/Form/*.html.twig",
  ],
  theme: {
  },
  plugins: [
  ],
}
```
## add this to assets/styles/app.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```


### Configure the Database
Edit `.env` to set your database connection:

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/symfonyblog?serverVersion=8.0&charset=utf8mb4"
```

## Step 2: Database Design

We need a main entity: **Article** (with associated images). Here’s the database schema:

- **Article**:
  - `id`: Integer, primary key, auto-increment
  - `title`: Varchar(255)
  - `content`: Text
  - `image`: Varchar(255), nullable (stores article image filename)
  - `created_at`: Datetime
  - `updated_at`: Datetime

This schema supports articles with optional images.

## Step 3: Create SQL Database and Entities

### Create the Database
Run the following command to create the database:

```bash
php bin/console doctrine:database:create
or php bin/console d:d:c 
```

### Create Article Entity
Use the Maker Bundle to generate `Article` entity.

```bash
php bin/console make:entity Article
```
Add fields: `title` (string), `content` (text), `image_path` (string), `created_at` (datetime).

Edit `src/Entity/Article.php`:

```php
<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use App\Repository\ArticleRepository;
use Symfony\Component\HttpFoundation\File\File;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: ArticleRepository::class)]
#[ORM\Table(name: 'article')]
#[Vich\Uploadable]
class Article
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $content = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $image_path = null;

    #[Vich\UploadableField(mapping: 'article_images', fileNameProperty: 'image_path')]
    private ?File $imageFile = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
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

    public function getImagePath(): ?string
    {
        return $this->image_path;
    }

    public function setImagePath(?string $image_path): static
    {
        $this->image_path = $image_path;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(\DateTimeImmutable $created_at): static
    {
        $this->created_at = $created_at;
        return $this;
    }

    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    public function setImageFile(?File $imageFile = null): void
    {
        $this->imageFile = $imageFile;
        
        if ($imageFile) {
            // It's required to update the updatedAt property when a new file is uploaded
            // This is needed for VichUploaderBundle to detect the change
            $this->updatedAt = new \DateTimeImmutable();
        }
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): static
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

This is the core of the project, focusing on uploading, validating, storing, and displaying images in multiple sizes.

### Configure VichUploaderBundle
Edit `config/packages/vich_uploader.yaml`:

```yaml
vich_uploader:
    db_driver: orm
    mappings:
        article_images:
            uri_prefix: /uploads/article_images
            upload_destination: '%kernel.project_dir%/public/uploads/article_images'
            namer: Vich\UploaderBundle\Naming\UniqidNamer
```

- **Explanation**:
  - `uri_prefix`: Public URL path for accessing images.
  - `upload_destination`: Filesystem path where images are stored.
  - `namer`: Generates unique filenames to avoid conflicts.

Create the upload directory:

```bash
mkdir -p public/uploads/article_images
```

### Configure LiipImagineBundle
Edit `config/packages/liip_imagine.yaml`:

```yaml
liip_imagine:
    # Use GD, imagick, or gmagick (GD is default and sufficient for most cases)
    driver: "gd"

    # Configure resolvers for caching
    resolvers:
        default:
            web_path:
                web_root: "%kernel.project_dir%/public"
                cache_prefix: "media/cache"


    filter_sets:
        index_card:
            quality: 85
            filters:
                thumbnail:
                    size: [600, 400]
                    mode: inset
                strip: ~
        article_large:
            quality: 90
            filters:
                thumbnail:
                    size: [1200, 800]
                    mode: inset
                strip: ~  # Remove metadata to reduce file size

```

- **Explanation**:
  - `index_card`: 600x400px for article listings.
  - `article_large`: 1200x800px for full article views.
  - `mode: inset`: Preserves aspect ratio, fits within specified dimensions.


### Create Article Form
```bash
php bin/console make:form ArticleType
```

Edit `src/Form/ArticleTypeForm.php`:

```php
<?php

namespace App\Form;

use App\Entity\Article;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\File;
use Vich\UploaderBundle\Form\Type\VichImageType;

class ArticleTypeForm extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('title', TextType::class, [
                'label' => 'Title',
                'attr' => ['placeholder' => 'Enter article title'],
            ])
            ->add('content', TextareaType::class, [
                'label' => 'Content',
                'attr' => ['placeholder' => 'Enter article content', 'rows' => 10],
            ])
            ->add('imageFile', VichImageType::class, [
                'label' => 'Image',
                'required' => false,
                'allow_delete' => true,
                'delete_label' => 'Delete image',
                'download_label' => 'Download image',
                'download_uri' => true,
                'image_uri' => true,
                'imagine_pattern' => 'index_card',
                'asset_helper' => true,
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

#### Create Article Repository
```php
<?php

namespace App\Repository;

use App\Entity\Article;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Article>
 */
class ArticleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Article::class);
    }

    /**
     * Find all articles ordered by creation date (newest first).
     *
     * @return Article[]
     */
    public function findRecentArticles(): array
    {
        return $this->createQueryBuilder('a')
            ->orderBy('a.created_at', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find an article by ID.
     *
     * @param int $id
     * @return Article|null
     */
    public function findOneById(int $id): ?Article
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
```

### Create Controller and Views
#### Article Controller
```bash
php bin/console make:controller ArticleController
```

Edit `src/Controller/ArticleController.php`:

```php
<?php

namespace App\Controller;

use App\Entity\Article;
use App\Form\ArticleTypeForm;
use App\Repository\ArticleRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class ArticleController extends AbstractController
{
    #[Route('/', name: 'article_index')]
    public function index(ArticleRepository $articleRepository): Response
    {
        $articles = $articleRepository->findRecentArticles();
        return $this->render('article/index.html.twig', [
            'articles' => $articles,
        ]);
    }

    #[Route('/article/new', name: 'article_new', methods: ['GET'])]
    public function showNewForm(): Response
    {
        $article = new Article();
        $form = $this->createForm(ArticleTypeForm::class, $article);
        
        return $this->render('article/new.html.twig', [
            'form' => $form->createView(),
        ]);
    }
    
    #[Route('/article/new', name: 'article_create', methods: ['POST'])]
    public function createArticle(Request $request, EntityManagerInterface $entityManager): Response
    {
        $article = new Article();
        $form = $this->createForm(ArticleTypeForm::class, $article);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($article);
            $entityManager->flush();
            
            $this->addFlash('success', 'Article created successfully.');
            return $this->redirectToRoute('article_index');
        }
        
        // If form validation failed, render the form again with errors
        return $this->render('article/new.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    #[Route('/article/{id}', name: 'article_show')]
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

{% block title %}Create New Article - Symfony Blog{% endblock %}

{% block body %}
	<section class="py-12 bg-gray-100">
		<div class="container mx-auto px-4">
			<h1 class="text-4xl font-bold text-gray-800 mb-8 text-center animate-fade-in">Create New Article</h1>
			<div class="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-8 transform transition-transform hover:shadow-xl">
				{{ form_start(form, {'attr': {'class': 'space-y-6', 'enctype': 'multipart/form-data', 'method': 'POST', 'id': 'article-form'}}) }}
				{{ form_row(form.title, {
                        'attr': {
                            'class': 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                            'placeholder': 'Enter article title'
                        }
                    }) }}
				{{ form_row(form.content, {
                        'attr': {
                            'class': 'w-full p-3 border border-gray-300 rounded-lg h-40 resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                            'placeholder': 'Write your article content here...'
                        }
                    }) }}
				{{ form_row(form.imageFile, {
                        'attr': {
                            'class': 'block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer'
                        }
                    }) }}
				<div class="flex justify-center space-x-4">
					<button type="submit" class="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-500 transition-transform transform hover:scale-105">
						Create Article
					</button>
					<a href="{{ path('article_index') }}" class="px-6 py-3 text-blue-600 font-semibold hover:underline">
						Back to Articles
					</a>
				</div>
				{{ form_end(form)}}
			</div>
		</div>
	</section>
{% endblock %}
```

Create `templates/article/index.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}Blog - Symfony Blog
{% endblock %}

{% block body %}
	<h1 class="text-3xl font-bold mb-8 text-center animate-fade-in">Blog Articles</h1>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		{% for article in articles %}
			<article class="bg-white shadow-lg rounded-lg p-3 hover:shadow-xl transition-shadow">
				<a href="{{ path('article_show', {'id': article.id}) }}" class="cursor-pointer">
					{% if article.imagePath %}
						<img src="{{ vich_uploader_asset(article, 'imageFile')|imagine_filter('index_card') }}" alt="{{ article.title }}" class="w-full h-48 object-cover rounded-lg mb-4">
					{% else %}
						<div class="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
							<span class="text-gray-500">No Image</span>
						</div>
					{% endif %}
					<h2 class="text-xl font-semibold mb-2">
						<a href="{{ path('article_show', {'id': article.id}) }}" class="text-blue-600 hover:underline">{{ article.title }}</a>
					</h2>
					<p class="text-gray-600 mb-2">{{ article.content|slice(0, 100) ~ '...' }}</p>
					<div class="text-sm text-gray-500">
						<p>Posted on
							{{ article.createdAt|date('F j, Y') }}</p>
					</div>
					<a href="{{ path('article_show', {'id': article.id}) }}" class="text-blue-500 hover:underline">Read More →</a>
				</a>
			</article>
		{% else %}
			<p class="text-center col-span-full">No articles found.</p>
		{% endfor %}
	</div>
{% endblock %}

```

Create `templates/article/show.html.twig`:

```twig
{% extends 'base.html.twig' %}

{% block title %}{{ article.title }} - Symfony Blog{% endblock %}

{% block body %}
    <article class="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6 text-gray-900">{{ article.title }}</h1>
        <div class="flex items-center text-gray-600 mb-6">
            <p>Posted on {{ article.createdAt|date('F j, Y') }}</p>
        </div>
        {% if article.imagePath %}
            <img src="{{ vich_uploader_asset(article, 'imageFile')|imagine_filter('article_large') }}" alt="{{ article.title }}" class="w-full h-96 object-cover rounded-lg mb-6">
        {% endif %}
        <div class="prose max-w-none">
            {{ article.content|raw }}
        </div>
    </article>
{% endblock %}
```

Create a base template `templates/base.html.twig`:

```twig
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}Symfony Blog{% endblock %}</title>
    {% block stylesheets %}
        <link rel="stylesheet" href="{{ asset('styles/app.css') }}">
    {% endblock %}
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body class="font-sans antialiased bg-gray-100 text-gray-900">
    <header class="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div class="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
            <div class="text-2xl font-bold tracking-tight">
                <a href="{{ path('article_index') }}" class="hover:text-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white">Symfony Blog</a>
            </div>
            <button id="menu-toggler" class="md:hidden focus:outline-none focus:ring-2 focus:ring-white" aria-label="Toggle navigation menu" aria-expanded="false">
                <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
            <nav id="menu" class="hidden md:flex md:items-center md:space-x-6 absolute md:static top-full left-0 w-full md:w-auto p-4 md:p-0 bg-blue-600 md:bg-transparent transition-all duration-300">
                <a href="{{ path('article_new') }}" class="block md:inline-block py-2 px-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white">Add Article</a>
            </nav>
        </div>
    </header>

    <main class="max-w-7xl mx-auto mt-8 px-4">
        {% block body %}{% endblock %}
    </main>

    <footer class="bg-gray-900 text-gray-300 py-8 mt-12">
        <div class="max-w-7xl mx-auto px-4 text-center">
            <p>© {{ 'now'|date('Y') }} Symfony Blog. All rights reserved.</p>
            <p class="mt-2">
                Built with
                <a href="https://symfony.com" class="text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400">Symfony</a>
                &
                <a href="https://tailwindcss.com" class="text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400">Tailwind CSS</a>.
            </p>
        </div>
    </footer>

    {% block javascripts %}
        <script>
            const toggler = document.getElementById('menu-toggler');
            const menu = document.getElementById('menu');

            toggler.addEventListener('click', () => {
                menu.classList.toggle('hidden');
                const expanded = toggler.getAttribute('aria-expanded') === 'true';
                toggler.setAttribute('aria-expanded', !expanded);
            });
        </script>
    {% endblock %}
    {{ encore_entry_script_tags('app') }}
</body>
</html>

```

## Testing the Application
1. Start the Symfony server:
   ```bash
   symfony server:start
   ```

1. Create articles at `/article/new` to upload article images.
2. View articles at `/article/` (index) and `/article/{id}` (show) to see images in different sizes.
