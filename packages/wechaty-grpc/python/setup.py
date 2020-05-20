''' setup '''

import json
import semver
import setuptools


def versioning(version: str) -> str:
    """version to specification"""
    sem_ver = semver.parse(version)

    major = sem_ver['major']
    minor = sem_ver['minor']
    patch = str(sem_ver['patch'])

    if minor % 2:
        patch = 'dev' + patch

    fin_ver = '%d.%d.%s' % (
        major,
        minor,
        patch,
    )

    return fin_ver


def setup() -> None:
    """setup"""
    with open('../README.md', 'r') as fh:
        long_description = fh.read()

    with open('../package.json') as f:
        pkg = json.load(f)
        version = versioning(pkg['version'])

    setuptools.setup(
        name='chatie-grpc',
        version=version,
        author='Huan LI (李卓桓)',
        author_email='zixia@zixia.net',
        description='gRPC for Chatie',
        long_description=long_description,
        long_description_content_type='text/markdown',
        license='Apache-2.0',
        url='https://github.com/chatie/grpc',
        packages=setuptools.find_packages("src"),
        package_dir={'': 'src'},
        classifiers=[
            'Programming Language :: Python :: 3.7',
            'License :: OSI Approved :: Apache Software License',
            'Operating System :: OS Independent',
        ],
        install_requires=['betterproto', 'grpclib']
    )


setup()
